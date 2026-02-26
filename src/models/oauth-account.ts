import mongoose, { Schema } from "mongoose";
import type { IOAuthAccount } from "@/types";

const OAuthAccountSchema = new Schema<IOAuthAccount>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    provider: { type: String, required: true, default: "microsoft" },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: { type: String, required: true },
  },
  { timestamps: true }
);

OAuthAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const OAuthAccount =
  mongoose.models.OAuthAccount ??
  mongoose.model<IOAuthAccount>("OAuthAccount", OAuthAccountSchema);
