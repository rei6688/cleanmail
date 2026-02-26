import { auth } from "@/lib/auth";
import { findUserByMicrosoftId } from "@/repositories/users";
import { getRules } from "@/repositories/rules";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RuleActions } from "@/components/rule-actions";
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
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </Link>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-500">No rules yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Create your first rule to start organizing emails.
            </p>
            <Link
              href="/rules/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Rule
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={String(rule._id)}>
              <CardContent className="flex items-start justify-between p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                    <Badge variant={rule.enabled ? "success" : "secondary"}>
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    → {rule.targetFolder}
                    {rule.conditions.senders.length > 0 &&
                      ` · from: ${rule.conditions.senders.slice(0, 2).join(", ")}${rule.conditions.senders.length > 2 ? "…" : ""}`}
                    {rule.conditions.subjectKeywords.length > 0 &&
                      ` · subject: ${rule.conditions.subjectKeywords.slice(0, 2).join(", ")}${rule.conditions.subjectKeywords.length > 2 ? "…" : ""}`}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Category: {rule.categoryAction.policy}
                    {rule.categoryAction.categories.length > 0 &&
                      ` (${rule.categoryAction.categories.join(", ")})`}
                  </p>
                </div>
                <RuleActions
                  ruleId={String(rule._id)}
                  enabled={rule.enabled}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
