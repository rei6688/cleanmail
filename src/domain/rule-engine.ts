import type { IRule, GraphMessage } from "@/types";

/**
 * Tests whether a single message matches the rule conditions.
 * Pure function - no I/O, easy to unit-test.
 */
export function messageMatchesRule(
  message: GraphMessage,
  rule: IRule
): boolean {
  const cond = rule.conditions;
  const subject = (message.subject ?? "").toLowerCase();
  const sender = (
    message.from?.emailAddress?.address ?? ""
  ).toLowerCase();

  // ── sender filter ──────────────────────────────────────────────────────────
  if (cond.senders.length > 0) {
    const matchesSender = cond.senders.some((s) =>
      sender.includes(s.toLowerCase())
    );
    if (!matchesSender) return false;
  }

  // ── subject keyword filter (include) ─────────────────────────────────────
  if (cond.subjectKeywords.length > 0) {
    const matchesKeyword = cond.subjectKeywords.some((kw) =>
      subject.includes(kw.toLowerCase())
    );
    if (!matchesKeyword) return false;
  }

  // ── subject keyword filter (exclude) ─────────────────────────────────────
  if (cond.excludeKeywords.length > 0) {
    const matchesExclude = cond.excludeKeywords.some((kw) =>
      subject.includes(kw.toLowerCase())
    );
    if (matchesExclude) return false;
  }

  // ── read/unread filter ─────────────────────────────────────────────────────
  if (cond.readFilter === "read" && message.isRead !== true) return false;
  if (cond.readFilter === "unread" && message.isRead !== false) return false;

  // ── source folder filter ──────────────────────────────────────────────────
  if (cond.sourceFolders.length > 0) {
    const parentId = message.parentFolderId ?? "";
    const matchesFolder = cond.sourceFolders.some(
      (f) =>
        parentId.toLowerCase() === f.toLowerCase() ||
        parentId.toLowerCase().includes(f.toLowerCase())
    );
    if (!matchesFolder) return false;
  }

  return true;
}

/**
 * Filters a list of messages against a single rule.
 */
export function applyRule(
  messages: GraphMessage[],
  rule: IRule
): GraphMessage[] {
  if (!rule.enabled) return [];
  return messages.filter((m) => messageMatchesRule(m, rule));
}

/**
 * Given a message and its rule, compute the new categories array.
 */
export function computeCategories(
  currentCategories: string[],
  rule: IRule
): string[] {
  const { policy, categories } = rule.categoryAction;

  switch (policy) {
    case "add":
      return Array.from(new Set([...currentCategories, ...categories]));
    case "replace":
      return [...categories];
    case "remove":
      return currentCategories.filter((c) => !categories.includes(c));
    case "none":
    default:
      return currentCategories;
  }
}
