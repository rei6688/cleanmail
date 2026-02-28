import { auth } from "@/lib/auth";
import { findUserByMicrosoftId } from "@/repositories/users";
import { getLogs } from "@/repositories/execution-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Types } from "mongoose";

export default async function LogsPage() {
  const session = await auth();
  const microsoftId = (
    (session?.user as { microsoftId?: string })
  )?.microsoftId;

  let logs: Awaited<ReturnType<typeof getLogs>> = [];
  if (microsoftId) {
    const dbUser = await findUserByMicrosoftId(microsoftId);
    if (dbUser) {
      logs = await getLogs(dbUser._id as Types.ObjectId, 100);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Execution Logs</h1>
        <p className="text-sm text-gray-500">{logs.length} recent log entries</p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            No logs yet. Run an organize pass to see results here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={String(log._id)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {log.ruleName ?? "All rules"}
                      </p>
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
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(log.startedAt).toLocaleString()} →{" "}
                      {new Date(log.finishedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">
                      <span className="font-medium">{log.stats.matched}</span>{" "}
                      matched
                    </span>
                    <span className="text-green-700">
                      <span className="font-medium">{log.stats.moved}</span>{" "}
                      moved
                    </span>
                    {log.stats.deleted > 0 && (
                      <span className="text-purple-700">
                        <span className="font-medium">{log.stats.deleted}</span>{" "}
                        deleted
                      </span>
                    )}
                    {log.stats.failed > 0 && (
                      <span className="text-red-700">
                        <span className="font-medium">{log.stats.failed}</span>{" "}
                        failed
                      </span>
                    )}
                    {log.stats.skipped > 0 && (
                      <span className="text-gray-500">
                        <span className="font-medium">{log.stats.skipped}</span>{" "}
                        skipped
                      </span>
                    )}
                  </div>
                </div>
                {log.errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{log.errorMessage}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
