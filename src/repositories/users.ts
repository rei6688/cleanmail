import { connectDB } from "@/infra/db/connection";
import { User } from "@/models/user";
import type { IUser } from "@/types";
import { pojoify } from "@/lib/utils";

export async function upsertUser(data: {
  microsoftId: string;
  email: string;
  name: string;
  image?: string;
}): Promise<IUser> {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { microsoftId: data.microsoftId },
    { $set: data },
    { upsert: true, new: true, lean: true }
  );
  return pojoify(user as unknown as IUser);
}

export async function findUserByMicrosoftId(
  microsoftId: string
): Promise<IUser | null> {
  await connectDB();
  const user = await User.findOne({ microsoftId }).lean();
  return pojoify(user as unknown as IUser | null);
}

export async function findAllUsers(): Promise<IUser[]> {
  await connectDB();
  const users = await User.find({}).lean();
  return pojoify(users as unknown as IUser[]);
}
