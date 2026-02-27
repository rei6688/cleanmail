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
    if (!matchesSender) {
      console.log(`[match] Fail: Sender "${sender}" does not match [${cond.senders}]`);
      return false;
    }
  }

  // ── subject keyword filter (include) ─────────────────────────────────────
  if (cond.subjectKeywords.length > 0) {
    const matchesKeyword = cond.subjectKeywords.some((kw) =>
      subject.includes(kw.toLowerCase())
    );
    if (!matchesKeyword) {
      console.log(`[match] Fail: Subject "${subject}" does not match [${cond.subjectKeywords}]`);
      return false;
    }
  }

  // ── body keyword filter (include) ─────────────────────────────────────────
  if (cond.bodyKeywords && cond.bodyKeywords.length > 0) {
    const bodyText = (
      (message.body?.content ?? "") + (message.bodyPreview ?? "")
    ).toLowerCase();

    const matchesBodyKeyword = cond.bodyKeywords.some((kw) =>
      bodyText.includes(kw.toLowerCase())
    );
    if (!matchesBodyKeyword) {
      console.log(`[match] Fail: Body (len: ${bodyText.length}) does not match [${cond.bodyKeywords}]`);
      return false;
    }
  }

  // ── subject keyword filter (exclude) ─────────────────────────────────────
  if (cond.excludeKeywords.length > 0) {
    const matchesExclude = cond.excludeKeywords.some((kw) =>
      subject.includes(kw.toLowerCase())
    );
    if (matchesExclude) {
      console.log(`[match] Fail: Subject excluded by "${subject}" contains [${cond.excludeKeywords}]`);
      return false;
    }
  }

  // ── read/unread filter ─────────────────────────────────────────────────────
  if (cond.readFilter === "read" && message.isRead !== true) return false;
  if (cond.readFilter === "unread" && message.isRead !== false) return false;

  console.log(`[match] SUCCESS: Found mail "${subject}"`);
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
