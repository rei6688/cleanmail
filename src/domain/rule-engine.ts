import type { IRule, GraphMessage } from "@/types";

/**
 * Tests whether a single message matches the rule conditions.
 * Pure function - no I/O, easy to unit-test.
 */
export function messageMatchesRule(
  message: GraphMessage,
  rule: IRule,
  options?: { ignoreRetention?: boolean }
): boolean {
  const cond = rule.conditions;
  const subject = (message.subject ?? "").toLowerCase().normalize("NFC");
  const sender = (
    message.from?.emailAddress?.address ?? ""
  ).toLowerCase().normalize("NFC");

  // ── sender filter ──────────────────────────────────────────────────────────
  if (cond.senders.length > 0) {
    const matchesSender = cond.senders.some((s) => {
      const cleanS = s.toLowerCase().trim().normalize("NFC");
      return sender.includes(cleanS);
    });
    if (!matchesSender) {
      if (rule.name.includes("VIB") || cond.senders.some(s => s.includes("vib"))) {
        console.log(`[debug] Sender mismatch for VIB rule: "${sender}" does not contain any of [${cond.senders}]`);
      }
      return false;
    }
  }

  // ── subject keyword filter (include) ─────────────────────────────────────
  if (cond.subjectKeywords.length > 0) {
    const matchesKeyword = cond.subjectKeywords.some((kw) => {
      const cleanKw = kw.toLowerCase().trim().normalize("NFC");
      return subject.includes(cleanKw);
    });
    if (!matchesKeyword) {
      if (rule.name.includes("VIB") || cond.senders.some(s => s.includes("vib"))) {
        console.log(`[debug] Subject mismatch! Mail: "${subject}" | Rule needs any of: [${cond.subjectKeywords.map(k => k.toLowerCase().trim())}]`);
      }
      return false;
    }
  }

  // ── body keyword filter (include) ─────────────────────────────────────────
  if (cond.bodyKeywords && cond.bodyKeywords.length > 0) {
    const bodyText = (
      (message.body?.content ?? "") + (message.bodyPreview ?? "")
    ).toLowerCase();

    const matchesBodyKeyword = cond.bodyKeywords.some((kw) =>
      bodyText.includes(kw.toLowerCase().normalize("NFC"))
    );
    if (!matchesBodyKeyword) {
      if (cond.senders.length > 0) {
        console.log(`[debug] Body mismatch! Body does not contain: [${cond.bodyKeywords.map(k => k.toLowerCase())}]`);
      }
      return false;
    }
  }

  // ── subject keyword filter (exclude) ─────────────────────────────────────
  if (cond.excludeKeywords.length > 0) {
    const matchesExclude = cond.excludeKeywords.some((kw) =>
      subject.includes(kw.toLowerCase().normalize("NFC"))
    );
    if (matchesExclude) return false;
  }

  // ── read/unread filter ─────────────────────────────────────────────────────
  // User requested to disable this filter or "ignore" it ("bỏ qua vụ read, unread đi nha")
  /*
  if (cond.readFilter === "read" && message.isRead !== true) {
    if (rule.name.includes("VIB")) console.log(`[debug] Skip: Rule requires READ mail, but this is UNREAD`);
    return false;
  }
  if (cond.readFilter === "unread" && message.isRead !== false) return false;
  */

  // ── retention filter ───────────────────────────────────────────────────────
  if (rule.retentionDays && rule.retentionDays > 0 && !options?.ignoreRetention) {
    if (!message.receivedDateTime) return false;
    const receivedDate = new Date(message.receivedDateTime);
    const ageInMs = Date.now() - receivedDate.getTime();
    const retentionMs = rule.retentionDays * 24 * 60 * 60 * 1000;

    if (ageInMs < retentionMs) {
      const daysOld = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
      console.log(`[match] Skip: Mail is too new (${daysOld} days old). Rule requires ${rule.retentionDays} days aging.`);
      return false;
    }
  }

  console.log(`[match] SUCCESS: Found mail "${subject}"`);
  return true;
}

/**
 * Filters a list of messages against a single rule.
 */
export function applyRule(
  messages: GraphMessage[],
  rule: IRule,
  options?: { ignoreRetention?: boolean }
): GraphMessage[] {
  if (!rule.enabled) return [];
  return messages.filter((m) => messageMatchesRule(m, rule, options));
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
