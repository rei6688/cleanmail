import { auth } from "@/lib/auth";
import { findUserByMicrosoftId } from "@/repositories/users";
import { getRules } from "@/repositories/rules";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RuleList } from "@/components/rule-list";
import type { Types } from "mongoose";

export default async function RulesPage() {
  const session = await auth();
  const microsoftId = (
    (session?.user as { microsoftId?: string })
  )?.microsoftId;

  let rules: Awaited<ReturnType<typeof getRules>> = [];
  if (microsoftId) {
    const dbUser = await findUserByMicrosoftId(microsoftId);
    if (dbUser) {
      rules = await getRules(dbUser._id as Types.ObjectId);
    }
  }

  // Convert Mongoose documents to plain objects for the client component
  const plainRules = JSON.parse(JSON.stringify(rules));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rules</h1>
          <p className="text-sm text-gray-500">
            {rules.length} rule{rules.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Link
          href="/rules/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </Link>
      </div>

      {rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-20 text-center">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No rules yet</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-xs">
              Create your first rule to start automatically organizing your inbox into smart folders.
            </p>
            <Link
              href="/rules/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all font-bold"
            >
              <Plus className="h-4 w-4" />
              Create First Rule
            </Link>
          </CardContent>
        </Card>
      ) : (
        <RuleList rules={plainRules} />
      )}
    </div>
  );
}
