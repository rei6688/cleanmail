import type { IRule, GraphMessage, ExecutionStats } from "@/types";
import {
  moveMessage,
  updateMessageCategories,
  getFolderIdByName,
} from "@/infra/graph-client";
import { computeCategories } from "@/domain/rule-engine";

export interface OrganizeResult {
  stats: ExecutionStats;
  errors: { messageId: string; error: string }[];
}

/**
 * Applies a rule's move + category policy to a batch of matched messages.
 * If dryRun is true, skips actual Graph API calls and just returns predicted stats.
 */
export async function organizeMessages(
  accessToken: string,
  messages: GraphMessage[],
  rule: IRule,
  dryRun = false
): Promise<OrganizeResult> {
  const stats: ExecutionStats = {
    matched: messages.length,
    moved: 0,
    skipped: 0,
    failed: 0,
  };
  const errors: { messageId: string; error: string }[] = [];

  if (dryRun) {
    stats.moved = messages.length;
    return { stats, errors };
  }

  // Resolve folder name → id once (Graph accepts well-known names too)
  let targetFolderId = rule.targetFolder;
  try {
    const resolved = await getFolderIdByName(accessToken, rule.targetFolder);
    if (resolved) targetFolderId = resolved;
  } catch {
    // If we can't resolve, try with the raw value (might be an id already)
  }

  for (const message of messages) {
    try {
      // Move
      await moveMessage(accessToken, message.id, targetFolderId);

      // Categories
      if (rule.categoryAction.policy !== "none") {
        const current = message.categories ?? [];
        const next = computeCategories(current, rule);
        const currentSorted = [...current].sort();
        const nextSorted = [...next].sort();
        const changed =
          currentSorted.length !== nextSorted.length ||
          currentSorted.some((c, i) => c !== nextSorted[i]);
        if (changed) {
          await updateMessageCategories(accessToken, message.id, next);
        }
      }

      stats.moved++;
    } catch (e) {
      stats.failed++;
      errors.push({
        messageId: message.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { stats, errors };
}
