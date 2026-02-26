import { connectDB } from "@/infra/db/connection";
import { User } from "@/models/user";
import type { IUser } from "@/types";

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
    { upsert: true, new: true }
  );
  return user as unknown as IUser;
}

export async function findUserByMicrosoftId(
  microsoftId: string
): Promise<IUser | null> {
  await connectDB();
  return User.findOne({ microsoftId }).lean() as Promise<IUser | null>;
}
