import { z } from "zod";

export const CategoryPolicySchema = z.enum(["add", "replace", "remove", "none"]);
export const ReadFilterSchema = z.enum(["read", "unread", "any"]);

export const RuleConditionsSchema = z.object({
  senders: z.array(z.string()).default([]),
  subjectKeywords: z.array(z.string()).default([]),
  bodyKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  readFilter: ReadFilterSchema.default("any"),
  sourceFolders: z.array(z.string()).default([]),
});

export const CategoryActionSchema = z.object({
  policy: CategoryPolicySchema.default("none"),
  categories: z.array(z.string()).default([]),
});

export const CreateRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  enabled: z.boolean().default(true),
  conditions: RuleConditionsSchema,
  targetFolder: z.string().min(1, "Target folder is required"),
  categoryAction: CategoryActionSchema,
});

export const UpdateRuleSchema = CreateRuleSchema.partial();

export type CreateRuleInput = z.infer<typeof CreateRuleSchema>;
export type UpdateRuleInput = z.infer<typeof UpdateRuleSchema>;
