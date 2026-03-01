import { connectDB } from "@/infra/db/connection";
import { ExecutionLog } from "@/models/execution-log";
import type { IExecutionLog, ExecutionStats, LogStatus } from "@/types";
import mongoose, { Types } from "mongoose";
import { pojoify } from "@/lib/utils";

export interface CreateLogInput {
  userId: Types.ObjectId | string;
  ruleId?: Types.ObjectId | string;
  ruleName?: string;
  status: LogStatus;
  stats: ExecutionStats;
  errorMessage?: string;
  startedAt: Date;
  finishedAt: Date;
}

export async function createLog(data: CreateLogInput): Promise<IExecutionLog> {
  await connectDB();
  const log = await ExecutionLog.create(data);
  return pojoify(log.toObject() as unknown as IExecutionLog);
}

export async function getLogs(
  userId: string | Types.ObjectId,
  limit = 50
): Promise<IExecutionLog[]> {
  await connectDB();
  const logs = await ExecutionLog.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return pojoify(logs as unknown as IExecutionLog[]);
}

export async function getRecentStats(
  userId: string | Types.ObjectId
): Promise<{ totalMoved: number; totalDeleted: number; totalFailed: number; runs: number }> {
  await connectDB();
  const result = await ExecutionLog.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId.toString()) } },
    {
      $group: {
        _id: null,
        totalMoved: { $sum: "$stats.moved" },
        totalDeleted: { $sum: "$stats.deleted" },
        totalFailed: { $sum: "$stats.failed" },
        runs: { $sum: 1 },
      },
    },
  ]);
  if (!result.length) return { totalMoved: 0, totalDeleted: 0, totalFailed: 0, runs: 0 };
  return {
    totalMoved: result[0].totalMoved,
    totalDeleted: result[0].totalDeleted,
    totalFailed: result[0].totalFailed,
    runs: result[0].runs,
  };
}

export async function getDailyActivity(
  userId: string | Types.ObjectId,
  days = 7
) {
  await connectDB();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const result = await ExecutionLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId.toString()),
        startedAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
        count: { $sum: { $add: ["$stats.moved", { $ifNull: ["$stats.deleted", 0] }] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return pojoify(result);
}
