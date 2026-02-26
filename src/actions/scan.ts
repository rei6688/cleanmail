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
      parts.push(
        `receivedDateTime ge ${options.yearFrom}-01-01T00:00:00Z`
      );
    if (options.yearTo)
      parts.push(
        `receivedDateTime lt ${options.yearTo + 1}-01-01T00:00:00Z`
      );
    filter = parts.join(" and ");
  }

  const MAX_PAGES = 20; // cap at 1000 messages per folder per rule
  const matches: ScanMatch[] = [];

  for (const rule of rules) {
    const sourceFolders =
      rule.conditions.sourceFolders.length > 0
        ? rule.conditions.sourceFolders
        : ["inbox"];

    for (const folder of sourceFolders) {
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

        const matched = applyRule(value, rule);
        for (const m of matched) {
          matches.push({ message: m, rule: { id: String(rule._id), name: rule.name } });
        }
      } while (nextLink && pages < MAX_PAGES);
    }
  }

  return ok({ matches, total: matches.length });
}
