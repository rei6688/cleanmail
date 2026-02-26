import mongoose, { Schema } from "mongoose";
import type { IUser } from "@/types";

const UserSchema = new Schema<IUser>(
  {
    microsoftId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });

export const User =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
