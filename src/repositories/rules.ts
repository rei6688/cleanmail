import { connectDB } from "@/infra/db/connection";
import { Rule } from "@/models/rule";
import type { IRule } from "@/types";
import type { CreateRuleInput, UpdateRuleInput } from "@/schemas/rule";
import type { Types } from "mongoose";

export async function getRules(userId: string | Types.ObjectId): Promise<IRule[]> {
  await connectDB();
  return Rule.find({ userId })
    .sort({ createdAt: -1 })
    .lean() as Promise<IRule[]>;
}

export async function getEnabledRules(
  userId: string | Types.ObjectId
): Promise<IRule[]> {
  await connectDB();
  return Rule.find({ userId, enabled: true })
    .sort({ createdAt: -1 })
    .lean() as Promise<IRule[]>;
}

export async function getRuleById(
  id: string,
  userId: string | Types.ObjectId
): Promise<IRule | null> {
  await connectDB();
  return Rule.findOne({ _id: id, userId }).lean() as Promise<IRule | null>;
}

export async function createRule(
  userId: string | Types.ObjectId,
  data: CreateRuleInput
): Promise<IRule> {
  await connectDB();
  const rule = await Rule.create({ userId, ...data });
  return rule as unknown as IRule;
}

export async function updateRule(
  id: string,
  userId: string | Types.ObjectId,
  data: UpdateRuleInput
): Promise<IRule | null> {
  await connectDB();
  return Rule.findOneAndUpdate(
    { _id: id, userId },
    { $set: data },
    { new: true }
  ).lean() as Promise<IRule | null>;
}

export async function deleteRule(
  id: string,
  userId: string | Types.ObjectId
): Promise<boolean> {
  await connectDB();
  const result = await Rule.deleteOne({ _id: id, userId });
  return result.deletedCount > 0;
}
