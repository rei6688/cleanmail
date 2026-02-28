import mongoose, { Schema } from "mongoose";
import type { IExecutionLog } from "@/types";

const ExecutionStatsSchema = new Schema(
  {
    matched: { type: Number, default: 0 },
    moved: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false }
);

const ExecutionLogSchema = new Schema<IExecutionLog>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    ruleId: { type: Schema.Types.ObjectId, ref: "Rule" },
    ruleName: { type: String },
    status: {
      type: String,
      enum: ["success", "partial", "error"],
      required: true,
    },
    stats: { type: ExecutionStatsSchema, required: true },
    errorMessage: { type: String },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ExecutionLogSchema.index({ userId: 1, createdAt: -1 });
ExecutionLogSchema.index({ userId: 1, ruleId: 1, createdAt: -1 });

export const ExecutionLog =
  mongoose.models.ExecutionLog ??
  mongoose.model<IExecutionLog>("ExecutionLog", ExecutionLogSchema);
