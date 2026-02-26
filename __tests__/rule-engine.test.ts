import { messageMatchesRule, applyRule, computeCategories } from "../src/domain/rule-engine";
import type { IRule, GraphMessage } from "../src/types";
import type { Types } from "mongoose";

function makeRule(overrides: Partial<IRule["conditions"]> = {}, ruleOverrides: Partial<IRule> = {}): IRule {
  return {
    _id: "rule1" as unknown as Types.ObjectId,
    userId: "user1" as unknown as Types.ObjectId,
    name: "Test Rule",
    enabled: true,
    conditions: {
      senders: [],
      subjectKeywords: [],
      excludeKeywords: [],
      readFilter: "any",
      sourceFolders: [],
      ...overrides,
    },
    targetFolder: "Archive",
    categoryAction: { policy: "none", categories: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...ruleOverrides,
  };
}

function makeMessage(overrides: Partial<GraphMessage> = {}): GraphMessage {
  return {
    id: "msg1",
    subject: "Hello World",
    from: { emailAddress: { address: "sender@example.com", name: "Sender" } },
    isRead: false,
    categories: [],
    parentFolderId: "inbox",
    ...overrides,
  };
}

describe("messageMatchesRule", () => {
  it("matches any message when conditions are empty", () => {
    const rule = makeRule();
    const msg = makeMessage();
    expect(messageMatchesRule(msg, rule)).toBe(true);
  });

  it("filters by sender", () => {
    const rule = makeRule({ senders: ["newsletter@example.com"] });
    expect(messageMatchesRule(makeMessage({ from: { emailAddress: { address: "newsletter@example.com" } } }), rule)).toBe(true);
    expect(messageMatchesRule(makeMessage({ from: { emailAddress: { address: "other@example.com" } } }), rule)).toBe(false);
  });

  it("filters by sender partial match", () => {
    const rule = makeRule({ senders: ["noreply@"] });
    expect(messageMatchesRule(makeMessage({ from: { emailAddress: { address: "noreply@company.com" } } }), rule)).toBe(true);
    expect(messageMatchesRule(makeMessage({ from: { emailAddress: { address: "hello@company.com" } } }), rule)).toBe(false);
  });

  it("filters by subject keywords", () => {
    const rule = makeRule({ subjectKeywords: ["weekly digest"] });
    expect(messageMatchesRule(makeMessage({ subject: "Your Weekly Digest" }), rule)).toBe(true);
    expect(messageMatchesRule(makeMessage({ subject: "Invoice #123" }), rule)).toBe(false);
  });

  it("excludes by keyword", () => {
    const rule = makeRule({ subjectKeywords: ["deal"], excludeKeywords: ["invoice"] });
    expect(messageMatchesRule(makeMessage({ subject: "Great deal for you" }), rule)).toBe(true);
    expect(messageMatchesRule(makeMessage({ subject: "deal invoice" }), rule)).toBe(false);
  });

  it("filters read-only", () => {
    const rule = makeRule({ readFilter: "read" });
    expect(messageMatchesRule(makeMessage({ isRead: true }), rule)).toBe(true);
    expect(messageMatchesRule(makeMessage({ isRead: false }), rule)).toBe(false);
  });

  it("filters unread-only", () => {
    const rule = makeRule({ readFilter: "unread" });
    expect(messageMatchesRule(makeMessage({ isRead: false }), rule)).toBe(true);
    expect(messageMatchesRule(makeMessage({ isRead: true }), rule)).toBe(false);
  });

  it("filters by source folder", () => {
    const rule = makeRule({ sourceFolders: ["inbox"] });
    expect(messageMatchesRule(makeMessage({ parentFolderId: "inbox" }), rule)).toBe(true);
    expect(messageMatchesRule(makeMessage({ parentFolderId: "drafts" }), rule)).toBe(false);
  });
});

describe("applyRule", () => {
  it("returns empty array when rule is disabled", () => {
    const rule = makeRule({}, { enabled: false });
    const messages = [makeMessage(), makeMessage({ id: "msg2" })];
    expect(applyRule(messages, rule)).toHaveLength(0);
  });

  it("filters messages by rule conditions", () => {
    const rule = makeRule({ subjectKeywords: ["sale"] });
    const messages = [
      makeMessage({ id: "1", subject: "Big sale today" }),
      makeMessage({ id: "2", subject: "Invoice for order" }),
      makeMessage({ id: "3", subject: "50% sale off" }),
    ];
    const result = applyRule(messages, rule);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(["1", "3"]);
  });
});

describe("computeCategories", () => {
  it("returns unchanged categories for policy 'none'", () => {
    const rule = makeRule({}, { categoryAction: { policy: "none", categories: ["A"] } });
    expect(computeCategories(["Existing"], rule)).toEqual(["Existing"]);
  });

  it("adds categories without duplicates", () => {
    const rule = makeRule({}, { categoryAction: { policy: "add", categories: ["New", "Existing"] } });
    expect(computeCategories(["Existing"], rule)).toEqual(["Existing", "New"]);
  });

  it("replaces all categories", () => {
    const rule = makeRule({}, { categoryAction: { policy: "replace", categories: ["Fresh"] } });
    expect(computeCategories(["Old", "Stuff"], rule)).toEqual(["Fresh"]);
  });

  it("removes specified categories", () => {
    const rule = makeRule({}, { categoryAction: { policy: "remove", categories: ["Remove"] } });
    expect(computeCategories(["Keep", "Remove", "Also"], rule)).toEqual(["Keep", "Also"]);
  });
});
