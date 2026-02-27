"use server";

import { auth } from "@/lib/auth";
import { getOAuthAccount } from "@/repositories/oauth-accounts";
import { getEnabledRules, getRuleById } from "@/repositories/rules";
import { getValidToken } from "@/infra/token-refresh";
import { listMessages } from "@/infra/graph-client";
import { applyRule } from "@/domain/rule-engine";
import { organizeMessages } from "@/domain/organizer";
import { createLog } from "@/repositories/execution-logs";
import type { IRule, OrganizeOptions } from "@/types";
import { err, ok, type Result } from "@/types";
import type { Types } from "mongoose";
import { findUserByMicrosoftId } from "@/repositories/users";

export interface OrganizeResult {
  totalMatched: number;
  totalMoved: number;
  totalFailed: number;
  totalSkipped: number;
}

export async function organizeEmails(
  options: OrganizeOptions = {}
): Promise<Result<OrganizeResult>> {
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

  // Resolve rules
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

  if (rules.length === 0) {
    return ok({ totalMatched: 0, totalMoved: 0, totalFailed: 0, totalSkipped: 0 });
  }

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
    // Default 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    filter = `receivedDateTime ge ${sixMonthsAgo.toISOString()}`;
  }

  console.log(`[organize] User: ${dbUser.email}, Filter: ${filter}, Rules: ${rules.length}`);

  const startedAt = new Date();
  const ruleStats = new Map<string, { matched: number; moved: number; failed: number }>();
  rules.forEach((r) => {
    ruleStats.set(String(r._id), { matched: 0, moved: 0, failed: 0 });
  });

  // Collect unique source folders
  const allFolders = new Set<string>();
  rules.forEach((r) => {
    if (r.conditions.sourceFolders.length > 0) {
      r.conditions.sourceFolders.forEach((f) => allFolders.add(f));
    } else {
      allFolders.add("inbox");
    }
  });

  const MAX_PAGES = 5;
  for (const folder of Array.from(allFolders)) {
    console.log(`[organize] Scanning folder: ${folder}`);
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

      for (const message of value) {
        for (const rule of rules) {
          const isTargeted =
            (rule.conditions.sourceFolders.length === 0 && folder === "inbox") ||
            rule.conditions.sourceFolders.some(
              (f) => f.toLowerCase() === folder.toLowerCase()
            );

          if (isTargeted && applyRule([message], rule).length > 0) {
            const stats = ruleStats.get(String(rule._id))!;
            stats.matched++;

            try {
              if (!options.dryRun) {
                const result = await organizeMessages(
                  accessToken,
                  [message],
                  rule,
                  false
                );
                stats.moved += result.stats.moved;
                stats.failed += result.stats.failed;
              } else {
                stats.moved++;
              }
            } catch (err) {
              console.error(
                `[organize] Failed to move message ${message.id} for rule ${rule.name}`,
                err
              );
              stats.failed++;
            }
          }
        }
      }
    } while (nextLink && pages < MAX_PAGES);
  }

  // Persist logs and calculate total
  let totalMatched = 0,
    totalMoved = 0,
    totalFailed = 0;
  for (const rule of rules) {
    const stats = ruleStats.get(String(rule._id))!;
    totalMatched += stats.matched;
    totalMoved += stats.moved;
    totalFailed += stats.failed;

    if (stats.matched > 0 || stats.failed > 0) {
      await createLog({
        userId: dbUser._id as Types.ObjectId,
        ruleId: rule._id,
        ruleName: rule.name,
        status:
          stats.failed === 0 ? "success" : stats.moved > 0 ? "partial" : "error",
        stats: {
          matched: stats.matched,
          moved: stats.moved,
          skipped: 0,
          failed: stats.failed,
        },
        startedAt,
        finishedAt: new Date(),
      });
    }
  }

  return ok({ totalMatched, totalMoved, totalFailed, totalSkipped: 0 });
}
