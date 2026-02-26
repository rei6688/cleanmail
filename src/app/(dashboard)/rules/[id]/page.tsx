import { auth } from "@/lib/auth";
import { findUserByMicrosoftId } from "@/repositories/users";
import { getRuleById } from "@/repositories/rules";
import { RuleForm } from "@/components/rule-form";
import { notFound } from "next/navigation";
import type { Types } from "mongoose";

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const microsoftId = (
    (session?.user as { microsoftId?: string })
  )?.microsoftId;

  if (!microsoftId) return notFound();
  const dbUser = await findUserByMicrosoftId(microsoftId);
  if (!dbUser) return notFound();

  const rule = await getRuleById(id, dbUser._id as Types.ObjectId);
  if (!rule) return notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Rule</h1>
        <p className="text-sm text-gray-500">{rule.name}</p>
      </div>
      <RuleForm rule={rule} />
    </div>
  );
}
