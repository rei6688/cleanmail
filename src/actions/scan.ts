"use server";

import { auth } from "@/lib/auth";
import { getOAuthAccount } from "@/repositories/oauth-accounts";
import { getEnabledRules, getRuleById } from "@/repositories/rules";
import { getValidToken } from "@/infra/token-refresh";
import { listMessages } from "@/infra/graph-client";
import { applyRule } from "@/domain/rule-engine";
import type { GraphMessage, IRule, ScanOptions } from "@/types";
import { err, ok, type Result } from "@/types";
import type { Types } from "mongoose";
import { findUserByMicrosoftId } from "@/repositories/users";

export interface ScanMatch {
  message: GraphMessage;
  rule: { id: string; name: string };
}

export interface ScanResult {
  matches: ScanMatch[];
  total: number;
}

export async function scanEmails(
  options: ScanOptions = {}
): Promise<Result<ScanResult>> {
  const session = await auth();
  if (!session?.user) return err("Not authenticated");

  const microsoftId = (
    (session.user as { microsoftId?: string })
  ).microsoftId;
  if (!microsoftId) return err("No Microsoft account linked");

  const dbUser = await findUserByMicrosoftId(microsoftId);
  if (!dbUser) return err("User not found");

  const oauthAccount = await getOAuthAccount(dbUser._id as Types.ObjectId);
  if (!oauthAccount) return err("No OAuth account found");

  const { accessToken } = await getValidToken(
    oauthAccount,
    dbUser._id as Types.ObjectId
  );

  // Build rules to apply
  let rules: IRule[];
  if (options.ruleId) {
    const rule = await getRuleById(
      options.ruleId,
      dbUser._id as Types.ObjectId
    );
    if (!rule) return err("Rule not found");
    rules = [rule];
  } else {
    rules = await getEnabledRules(dbUser._id as Types.ObjectId);
  }

  if (rules.length === 0) return ok({ matches: [], total: 0 });

  // Build date filter
  let filter: string | undefined;
  if (options.yearFrom || options.yearTo) {
    const parts: string[] = [];
    if (options.yearFrom)
      parts.push(`receivedDateTime ge ${options.yearFrom}-01-01T00:00:00Z`);
    if (options.yearTo)
      parts.push(`receivedDateTime lt ${options.yearTo + 1}-01-01T00:00:00Z`);
    filter = parts.join(" and ");
  } else if (options.monthsBack) {
    const since = new Date();
    since.setMonth(since.getMonth() - options.monthsBack);
    filter = `receivedDateTime ge ${since.toISOString()}`;
  } else {
    // Default to last 6 months for performance
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    filter = `receivedDateTime ge ${sixMonthsAgo.toISOString()}`;
  }

  console.log(`[scan] User: ${dbUser.email}, Filter: ${filter}, Rules: ${rules.length}`);

  // Collect unique source folders
  const allFolders = new Set<string>();
  rules.forEach((r) => {
    if (r.conditions.sourceFolders.length > 0) {
      r.conditions.sourceFolders.forEach((f) => allFolders.add(f));
    } else {
      allFolders.add("inbox");
    }
  });

  const MAX_PAGES = 5; // Reduced default pages to avoid timeouts in dev
  const matches: ScanMatch[] = [];

  for (const folder of Array.from(allFolders)) {
    console.log(`[scan] Scanning folder: ${folder}`);
    let nextLink: string | undefined;
    let pages = 0;
    do {
      const { value, nextLink: nl } = await listMessages(accessToken, {
        folder,
        filter,
        top: 50,
      });
      nextLink = nl;
      pages++;

      console.log(`[scan] Fetched ${value.length} messages from ${folder} (page ${pages})`);

      for (const message of value) {
        for (const rule of rules) {
          // Verify if folder is relevant to this rule
          const isTargeted =
            rule.conditions.sourceFolders.length === 0 && folder === "inbox" ||
            rule.conditions.sourceFolders.some(f => f.toLowerCase() === folder.toLowerCase());

          if (isTargeted && applyRule([message], rule).length > 0) {
            matches.push({
              message,
              rule: { id: String(rule._id), name: rule.name }
            });
          }
        }
      }
    } while (nextLink && pages < MAX_PAGES);
  }

  console.log(`[scan] Completed. Found ${matches.length} total matches.`);
  return ok({ matches, total: matches.length });
}
