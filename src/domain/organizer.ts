import type { IRule, GraphMessage, ExecutionStats } from "@/types";
import {
  moveMessage,
  deleteMessage,
  updateMessageCategories,
  getFolderIdByName,
  createMailFolder,
  ensureFolderByPath,
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
  dryRun = false,
  stagingMode = false,
  stagingTag = "DEBUG",
  onlyTagMode = false,
  removeTag?: string,
  addTag?: string,
  clearCategories = false
): Promise<OrganizeResult> {
  const stats: ExecutionStats = {
    matched: messages.length,
    moved: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
  };
  const errors: { messageId: string; error: string }[] = [];

  if (dryRun) {
    if (rule.action?.type === "delete") stats.deleted = messages.length;
    else stats.moved = messages.length;
    return { stats, errors };
  }

  // Resolve target folder if move
  let targetFolderId = "";
  const actionType = rule.action?.type || "move";
  let targetFolderName = stagingMode ? "99_Staging_Review" : (rule.action?.targetFolder || (rule as any).targetFolder);

  if (!onlyTagMode && actionType === "move" && targetFolderName) {
    try {
      targetFolderId = await ensureFolderByPath(accessToken, targetFolderName);
    } catch (e) {
      console.error(`[organizer] FAILED to ensure folder path "${targetFolderName}":`, e);
      // If we can't find/create folder, we can't move. Count as failed.
      return {
        stats: { ...stats, failed: messages.length },
        errors: messages.map(m => ({ messageId: m.id, error: `Folder error: ${String(e)}` }))
      };
    }
  }

  for (const message of messages) {
    try {
      if (actionType === "delete" && !onlyTagMode) {
        await deleteMessage(accessToken, message.id);
        stats.deleted++;
      } else if (actionType === "move") {
        // Apply Categories FIRST before moving, because moving changes the Message ID!
        if (rule.categoryAction.policy !== "none" || stagingMode || onlyTagMode || removeTag || addTag || clearCategories) {
          const current = clearCategories ? [] : (message.categories ?? []);
          let next = computeCategories(current, rule);

          // Force add DEBUG tag if in staging mode
          if (stagingMode && stagingTag && !next.includes(stagingTag)) {
            next = [...next, stagingTag];
          }

          // Remove specific tag (e.g., old staging tag during production run)
          if (removeTag && next.some(t => t.toLowerCase() === removeTag.toLowerCase())) {
            next = next.filter((t) => t.toLowerCase() !== removeTag.toLowerCase());
          }

          if (addTag && !next.some(t => t.toLowerCase() === addTag.toLowerCase())) {
            next = [...next, addTag];
          }

          const currentSorted = [...current].sort();
          const nextSorted = [...next].sort();
          const changed =
            currentSorted.length !== nextSorted.length ||
            currentSorted.some((c, i) => i < nextSorted.length && c !== nextSorted[i]);

          if (changed) {
            try {
              await updateMessageCategories(accessToken, message.id, next);
              console.log(`[organizer] Successfully added categories [${next.join(", ")}] to message ${message.id}`);
            } catch (catError) {
              console.error(`[organizer] ERROR adding categories to message ${message.id}:`, catError);
            }
          }
        }

        // Move ONLY if not in onlyTagMode
        if (!onlyTagMode && targetFolderId) {
          await moveMessage(accessToken, message.id, targetFolderId);
        }
        stats.moved++;
      }
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
