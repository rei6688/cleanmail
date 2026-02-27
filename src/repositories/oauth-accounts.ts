import { connectDB } from "@/infra/db/connection";
import { OAuthAccount } from "@/models/oauth-account";
import type { IOAuthAccount } from "@/types";
import type { Types } from "mongoose";
import { pojoify } from "@/lib/utils";

export async function upsertOAuthAccount(data: {
  userId: Types.ObjectId;
  provider: "microsoft";
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}): Promise<IOAuthAccount> {
  await connectDB();
  const account = await OAuthAccount.findOneAndUpdate(
    { userId: data.userId, provider: data.provider },
    { $set: data },
    { upsert: true, new: true, lean: true }
  );
  return pojoify(account as unknown as IOAuthAccount);
}

export async function getOAuthAccount(
  userId: Types.ObjectId | string,
  provider = "microsoft"
): Promise<IOAuthAccount | null> {
  await connectDB();
  const account = await OAuthAccount.findOne({ userId, provider }).lean();
  return pojoify(account as unknown as IOAuthAccount | null);
}

export async function updateTokens(
  userId: Types.ObjectId | string,
  data: { accessToken: string; refreshToken: string; expiresAt: Date }
): Promise<void> {
  await connectDB();
  await OAuthAccount.updateOne(
    { userId, provider: "microsoft" },
    { $set: data }
  );
}
