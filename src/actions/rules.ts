"use server";

import { auth } from "@/lib/auth";
import {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
} from "@/repositories/rules";
import { findUserByMicrosoftId } from "@/repositories/users";
import type { CreateRuleInput, UpdateRuleInput } from "@/schemas/rule";
import { err, ok, type Result } from "@/types";
import type { IRule } from "@/types";
import type { Types } from "mongoose";
import { revalidatePath } from "next/cache";

async function getDbUserId(): Promise<Types.ObjectId | null> {
  const session = await auth();
  if (!session?.user) return null;
  const microsoftId = (
    (session.user as { microsoftId?: string })
  ).microsoftId;
  if (!microsoftId) return null;
  const dbUser = await findUserByMicrosoftId(microsoftId);
  return (dbUser?._id as Types.ObjectId) ?? null;
}

export async function listRulesAction(): Promise<Result<IRule[]>> {
  const userId = await getDbUserId();
  if (!userId) return err("Not authenticated");
  const rules = await getRules(userId);
  return ok(rules);
}

export async function getRuleAction(
  id: string
): Promise<Result<IRule>> {
  const userId = await getDbUserId();
  if (!userId) return err("Not authenticated");
  const rule = await getRuleById(id, userId);
  if (!rule) return err("Rule not found");
  return ok(rule);
}

export async function createRuleAction(
  data: CreateRuleInput
): Promise<Result<IRule>> {
  const userId = await getDbUserId();
  if (!userId) return err("Not authenticated");
  const rule = await createRule(userId, data);
  revalidatePath("/rules");
  return ok(rule);
}

export async function updateRuleAction(
  id: string,
  data: UpdateRuleInput
): Promise<Result<IRule>> {
  const userId = await getDbUserId();
  if (!userId) return err("Not authenticated");
  const rule = await updateRule(id, userId, data);
  if (!rule) return err("Rule not found");
  revalidatePath("/rules");
  return ok(rule);
}

export async function deleteRuleAction(
  id: string
): Promise<Result<boolean>> {
  const userId = await getDbUserId();
  if (!userId) return err("Not authenticated");
  const deleted = await deleteRule(id, userId);
  if (!deleted) return err("Rule not found");
  revalidatePath("/rules");
  return ok(true);
}

export async function toggleRuleAction(
  id: string,
  enabled: boolean
): Promise<Result<IRule>> {
  return updateRuleAction(id, { enabled });
}

export async function copyRuleAction(id: string): Promise<Result<IRule>> {
  const userId = await getDbUserId();
  if (!userId) return err("Not authenticated");

  const rule = await getRuleById(id, userId);
  if (!rule) return err("Rule not found");

  const castedRule = rule as any;
  const { _id, createdAt, updatedAt, ...rest } = castedRule.toObject ? castedRule.toObject() : castedRule;

  const cloned = await createRule(userId, {
    ...rest,
    name: `${rest.name} (Copy)`,
  });

  revalidatePath("/rules");
  return ok(cloned);
}
