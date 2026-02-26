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
  }

  const startedAt = new Date();
  let totalMatched = 0,
    totalMoved = 0,
    totalFailed = 0;
  const totalSkipped = 0;

  const MAX_PAGES = 20; // cap at 1000 messages per folder per rule
  for (const rule of rules) {
    const sourceFolders =
      rule.conditions.sourceFolders.length > 0
        ? rule.conditions.sourceFolders
        : ["inbox"];

    let ruleMatched = 0,
      ruleMoved = 0,
      ruleFailed = 0;

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
        if (matched.length === 0) continue;

        const result = await organizeMessages(
          accessToken,
          matched,
          rule,
          options.dryRun
        );

        ruleMatched += result.stats.matched;
        ruleMoved += result.stats.moved;
        ruleFailed += result.stats.failed;
      } while (nextLink && pages < MAX_PAGES);
    }

    totalMatched += ruleMatched;
    totalMoved += ruleMoved;
    totalFailed += ruleFailed;

    // Persist log per rule
    await createLog({
      userId: dbUser._id as Types.ObjectId,
      ruleId: rule._id,
      ruleName: rule.name,
      status:
        ruleFailed === 0
          ? "success"
          : ruleMoved > 0
          ? "partial"
          : "error",
      stats: {
        matched: ruleMatched,
        moved: ruleMoved,
        skipped: totalSkipped,
        failed: ruleFailed,
      },
      startedAt,
      finishedAt: new Date(),
    });
  }

  return ok({ totalMatched, totalMoved, totalFailed, totalSkipped });
}
