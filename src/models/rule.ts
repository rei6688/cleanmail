import mongoose, { Schema } from "mongoose";
import type { IRule } from "@/types";

const RuleConditionsSchema = new Schema(
  {
    senders: { type: [String], default: [] },
    subjectKeywords: { type: [String], default: [] },
    excludeKeywords: { type: [String], default: [] },
    readFilter: {
      type: String,
      enum: ["read", "unread", "any"],
      default: "any",
    },
    sourceFolders: { type: [String], default: [] },
  },
  { _id: false }
);

const CategoryActionSchema = new Schema(
  {
    policy: {
      type: String,
      enum: ["add", "replace", "remove", "none"],
      default: "none",
    },
    categories: { type: [String], default: [] },
  },
  { _id: false }
);

const RuleSchema = new Schema<IRule>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    conditions: { type: RuleConditionsSchema, required: true },
    targetFolder: { type: String, required: true },
    categoryAction: { type: CategoryActionSchema, required: true },
  },
  { timestamps: true }
);

RuleSchema.index({ userId: 1, enabled: 1 });
RuleSchema.index({ userId: 1, createdAt: -1 });

export const Rule =
  mongoose.models.Rule ?? mongoose.model<IRule>("Rule", RuleSchema);
