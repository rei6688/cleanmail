"use server";

import { auth } from "@/lib/auth";
import { getOAuthAccount } from "@/repositories/oauth-accounts";
import { getEnabledRules, getRuleById } from "@/repositories/rules";
import { getValidToken } from "@/infra/token-refresh";
import { listMessages, ensureFolderByPath, ensureMasterCategories } from "@/infra/graph-client";
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
  totalDeleted: number;
  totalFailed: number;
  totalSkipped: number;
  totalScanned?: number;
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
    return ok({ totalMatched: 0, totalMoved: 0, totalDeleted: 0, totalFailed: 0, totalSkipped: 0 });
  }

  // Pre-ensure master categories are set up so tags have correct colors
  // Using a Map for deduplication, where the last entry for a name wins.
  const categoriesMap = new Map<string, { displayName: string; color?: string }>();

  // 1. Add categories from rules (lower priority)
  for (const r of rules) {
    if (r.categoryAction.policy !== "none" && r.categoryAction.categories.length > 0) {
      r.categoryAction.categories.forEach(c => {
        const name = c.trim();
        if (name) {
          categoriesMap.set(name.toLowerCase(), {
            displayName: name,
            color: r.categoryAction.categoryColor
          });
        }
      });
    }
  }

  // 2. Add staging/manual tags (higher priority - overrides rule colors)
  if (options.stagingMode && options.stagingTag) {
    categoriesMap.set(options.stagingTag.trim().toLowerCase(), {
      displayName: options.stagingTag.trim(),
      color: options.stagingTagColor
    });
  }
  if (options.addTag) {
    categoriesMap.set(options.addTag.trim().toLowerCase(), {
      displayName: options.addTag.trim(),
      color: options.addTagColor
    });
  }

  const categoriesToEnsure = Array.from(categoriesMap.values());
  if (categoriesToEnsure.length > 0) {
    await ensureMasterCategories(accessToken, categoriesToEnsure);
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
    // Default 3 months to avoid timeout and excessive processing
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    filter = `receivedDateTime ge ${threeMonthsAgo.toISOString()}`;
  }

  // Build targeted filter if single rule for high efficiency
  if (options.ruleId && rules.length === 1) {
    const singleRule = rules[0];
    if (singleRule.conditions.senders.length > 0) {
      const senderFilters = singleRule.conditions.senders
        .map((s) => `from/emailAddress/address eq '${s.trim()}'`)
        .join(" or ");
      filter = filter ? `(${filter}) and (${senderFilters})` : `(${senderFilters})`;
    }
  }

  console.log(`[organize] User: ${dbUser.email}, Filter: ${filter}, Rules: ${rules.length}`);

  const startedAt = new Date();
  const ruleStats = new Map<string, { matched: number; moved: number; deleted: number; failed: number }>();
  rules.forEach((r) => {
    ruleStats.set(String(r._id), { matched: 0, moved: 0, deleted: 0, failed: 0 });
  });

  // Collect unique source folders
  const allFolders = new Set<string>();
  if (options.runInTargetFolder) {
    rules.forEach((r) => {
      const target = r.action?.targetFolder || (r as any).targetFolder;
      if (target) allFolders.add(target);
    });
  } else if (options.overrideSourceFolders && options.overrideSourceFolders.length > 0) {
    options.overrideSourceFolders.forEach(f => allFolders.add(f));
  } else {
    rules.forEach((r) => {
      if (r.conditions.sourceFolders.length > 0) {
        r.conditions.sourceFolders.forEach((f) => allFolders.add(f));
      } else {
        allFolders.add("inbox");
      }
    });
  }

  const MAX_SCANNED = options.ruleId ? 3000 : 1000; // Allow deeper scan for targeted rule
  let totalScanned = 0;
  const MAX_PAGES = 50;
  for (const folder of Array.from(allFolders)) {
    console.log(`[organize] Scanning folder: ${folder}`);

    let folderId = folder;
    const lowerFolder = folder.toLowerCase();
    const wellKnownFolders = ["inbox", "archive", "deleteditems", "drafts", "sentitems", "junkemail", "outbox"];
    if (!wellKnownFolders.includes(lowerFolder)) {
      try {
        folderId = await ensureFolderByPath(accessToken, folder);
      } catch (err) {
        console.warn(`[organize] Skipping folder "${folder}" - could not resolve its ID.`, err);
        continue;
      }
    }

    let nextLink: string | undefined;
    let pages = 0;
    do {
      const { value, nextLink: nl } = await listMessages(accessToken, {
        folder: folderId,
        filter,
        top: 50,
      });
      nextLink = nl;
      pages++;

      if (options.ruleId) {
        console.log(`[organize] Page ${pages}: Fetched ${value.length} potential items for targeted searching`);
      }

      for (const message of value) {
        totalScanned++;
        if (totalScanned > MAX_SCANNED) {
          console.log(`[organize] Hard limit reached (${MAX_SCANNED}). Stopping to prevent timeout.`);
          break;
        }

        if (options.ruleId) {
          console.log(`[debug] [${totalScanned}] Checking: "${message.subject}" from "${message.from?.emailAddress?.address}" (Read: ${message.isRead})`);
        }
        for (const rule of rules) {
          const isTargeted =
            !!options.runInTargetFolder ||
            !!options.overrideSourceFolders ||
            (rule.conditions.sourceFolders.length === 0 && folder === "inbox") ||
            rule.conditions.sourceFolders.some(
              (f) => f.toLowerCase() === folder.toLowerCase()
            );

          if (isTargeted && applyRule([message], rule, { ignoreRetention: !!options.ruleId }).length > 0) {
            const stats = ruleStats.get(String(rule._id))!;
            stats.matched++;

            try {
              if (!options.dryRun) {
                const result = await organizeMessages(
                  accessToken,
                  [message],
                  rule,
                  false,
                  options.stagingMode,
                  options.stagingTag,
                  options.onlyTagMode,
                  options.removeTag,
                  options.addTag,
                  options.clearCategories
                );
                stats.moved += result.stats.moved;
                stats.deleted += result.stats.deleted;
                stats.failed += result.stats.failed;
              } else {
                if (rule.action?.type === "delete") stats.deleted++;
                else stats.moved++;
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
      if (totalScanned > MAX_SCANNED) break;
    } while (nextLink && pages < MAX_PAGES);
    if (totalScanned > MAX_SCANNED) break;
  }

  // Persist logs and calculate total
  let totalMatched = 0,
    totalMoved = 0,
    totalDeleted = 0,
    totalFailed = 0;
  for (const rule of rules) {
    const stats = ruleStats.get(String(rule._id))!;
    totalMatched += stats.matched;
    totalMoved += stats.moved;
    totalDeleted += stats.deleted;
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
          deleted: stats.deleted,
          skipped: 0,
          failed: stats.failed,
        },
        startedAt,
        finishedAt: new Date(),
      });
    }
  }

  return ok({
    totalMatched,
    totalMoved,
    totalDeleted,
    totalFailed,
    totalScanned,
    totalSkipped: 0
  });
}
