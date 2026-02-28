import { auth } from "@/lib/auth";
import { findUserByMicrosoftId } from "@/repositories/users";
import { getRules } from "@/repositories/rules";
import { getLogs, getRecentStats, getDailyActivity } from "@/repositories/execution-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Mail, ListFilter, CheckCircle, XCircle, Zap, ShieldCheck } from "lucide-react";
import type { Types } from "mongoose";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const microsoftId = (
    (session?.user as { microsoftId?: string })
  )?.microsoftId;

  let rules: Awaited<ReturnType<typeof getRules>> = [];
  let recentLogs: Awaited<ReturnType<typeof getLogs>> = [];
  let stats = { totalMoved: 0, totalDeleted: 0, totalFailed: 0, runs: 0 };
  let dailyActivity: any[] = [];

  if (microsoftId) {
    const dbUser = await findUserByMicrosoftId(microsoftId);
    if (dbUser) {
      const userId = dbUser._id as Types.ObjectId;
      [rules, recentLogs, stats, dailyActivity] = await Promise.all([
        getRules(userId),
        getLogs(userId, 8),
        getRecentStats(userId),
        getDailyActivity(userId),
      ]);
    }
  }

  const enabledRules = rules.filter((r) => r.enabled);
  const uniqueTargetFolders = Array.from(new Set(rules.map(r => r.action?.targetFolder).filter(Boolean)));


  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Overview
        </h1>
        <p className="text-gray-500">
          Welcome back, <span className="text-indigo-600 font-semibold">{session?.user?.name}</span>. Your inbox is being managed.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Rules"
          value={enabledRules.length}
          description={`of ${rules.length} total configurations`}
          iconName="ListFilter"
          variant="indigo"
          delay={0.1}
        />
        <StatsCard
          title="Total Cleanup"
          value={stats.totalMoved + stats.totalDeleted}
          description="Messages successfully cleaned"
          iconName="CheckCircle"
          variant="cyan"
          delay={0.2}
        />
        <StatsCard
          title="Accuracy"
          value={stats.totalMoved + stats.totalDeleted + stats.totalFailed > 0
            ? `${Math.round(((stats.totalMoved + stats.totalDeleted) / (stats.totalMoved + stats.totalDeleted + stats.totalFailed)) * 100)}%`
            : "100%"}
          description="Successful move rate"
          iconName="ShieldCheck"
          variant="default"
          delay={0.3}
        />
        <StatsCard
          title="Operations"
          value={stats.runs}
          description="Automation runs triggered"
          iconName="Zap"
          variant="rose"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Column: Left (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <ActivityChart data={dailyActivity} />

          {/* Managed Folders Insight */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 px-1">
              Active Destinations
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-center">
              {uniqueTargetFolders.length === 0 ? (
                <div className="col-span-3 py-8 rounded-2xl bg-gray-50 border border-dashed text-gray-400 text-sm">
                  Configure rules to see target folders here
                </div>
              ) : (
                uniqueTargetFolders.slice(0, 3).map((folder) => (
                  <Card key={folder} className="border-gray-100 bg-white/50 hover:border-indigo-200 transition-colors">
                    <CardContent className="pt-6">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
                        <Mail className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate px-2">{folder}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-medium mt-1">Target Folder</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column: Right (1/3) */}
        <div className="space-y-8">
          {/* Account Status Card */}
          <Card className="border-indigo-100 bg-indigo-50/30 overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-indigo-100">
                  <ShieldCheck className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{session?.user?.email}</p>
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Connected via MS Graph</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions in Sidebar */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 px-1">
              Quick Tools
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <Link href="/scan">
                <Card className="group cursor-pointer border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors text-indigo-600 group-hover:text-white">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Run Scan</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 translate-x-0 group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/rules/new">
                <Card className="group cursor-pointer border-gray-100 hover:border-rose-200 hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-600 transition-colors text-rose-600 group-hover:text-white">
                      <ListFilter className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">New Rule</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-rose-600 translate-x-0 group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Recent Logs List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Recent Activity
              </h2>
              <Link
                href="/logs"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                See All
              </Link>
            </div>

            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <div className="text-center py-10 rounded-2xl bg-gray-50 border border-dashed text-gray-400 text-sm">
                  No activity yet
                </div>
              ) : (
                recentLogs.map((log) => (
                  <Card
                    key={String(log._id)}
                    className="overflow-hidden border-gray-100 bg-white/70 backdrop-blur-sm hover:border-indigo-200 transition-colors"
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        log.status === "success" ? "bg-green-500" : log.status === "partial" ? "bg-yellow-500" : "bg-red-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {log.ruleName || "Batch Cleanup"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">
                          {new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {(log.stats.moved || 0) + (log.stats.deleted || 0)} items
                        </p>
                      </div>
                      <Badge
                        className="text-[9px] h-4 px-1.5"
                        variant={
                          log.status === "success"
                            ? "success"
                            : log.status === "partial"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {log.status === "success" ? "Done" : log.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
