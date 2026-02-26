import { auth } from "@/lib/auth";
import { findUserByMicrosoftId } from "@/repositories/users";
import { getRules } from "@/repositories/rules";
import { getLogs, getRecentStats } from "@/repositories/execution-logs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Mail, ListFilter, CheckCircle, XCircle } from "lucide-react";
import type { Types } from "mongoose";

export default async function DashboardPage() {
  const session = await auth();
  const microsoftId = (
    (session?.user as { microsoftId?: string })
  )?.microsoftId;

  let rules: Awaited<ReturnType<typeof getRules>> = [];
  let recentLogs: Awaited<ReturnType<typeof getLogs>> = [];
  let stats = { totalMoved: 0, totalFailed: 0, runs: 0 };

  if (microsoftId) {
    const dbUser = await findUserByMicrosoftId(microsoftId);
    if (dbUser) {
      const userId = dbUser._id as Types.ObjectId;
      [rules, recentLogs, stats] = await Promise.all([
        getRules(userId),
        getLogs(userId, 5),
        getRecentStats(userId),
      ]);
    }
  }

  const enabledRules = rules.filter((r) => r.enabled);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              {enabledRules.length}
            </p>
            <p className="text-xs text-gray-400">of {rules.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Emails Moved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalMoved}
              </p>
            </div>
            <p className="text-xs text-gray-400">across {stats.runs} runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalFailed}
              </p>
            </div>
            <p className="text-xs text-gray-400">total errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/scan">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Scan Emails</p>
                <p className="text-sm text-gray-500">
                  Preview which emails match your rules
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/rules">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                <ListFilter className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Manage Rules</p>
                <p className="text-sm text-gray-500">
                  Create and edit your email rules
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
            <Link
              href="/logs"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentLogs.map((log) => (
                  <div
                    key={String(log._id)}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.ruleName ?? "All rules"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {log.stats.moved} moved
                      </span>
                      <Badge
                        variant={
                          log.status === "success"
                            ? "success"
                            : log.status === "partial"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
