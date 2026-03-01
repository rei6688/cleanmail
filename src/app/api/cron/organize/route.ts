import { NextResponse } from "next/server";
import { findAllUsers } from "@/repositories/users";
import { getOAuthAccount } from "@/repositories/oauth-accounts";
import { getEnabledRules } from "@/repositories/rules";
import { getValidToken } from "@/infra/token-refresh";
import { listMessages } from "@/infra/graph-client";
import { organizeMessages } from "@/domain/organizer";
import { createLog } from "@/repositories/execution-logs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Check Vercel Cron Secret for security
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const users = await findAllUsers();
  const summary: any[] = [];

  for (const user of users) {
    try {
      const account = await getOAuthAccount(user._id);
      if (!account) continue;

      const { accessToken } = await getValidToken(account, user._id);
      const enabledRules = await getEnabledRules(user._id);

      for (const rule of enabledRules) {
        const startedAt = new Date();
        try {
          // 1. Fetch messages matching the rule's source folders (default inbox)
          // We limit top 100 for cron to avoid timeouts
          const { value: messages } = await listMessages(accessToken, {
            folder: (rule.conditions.sourceFolders?.[0]) || "inbox",
            top: 100
          });

          // 2. Filter messages in-memory using rule-engine (including body search)
          const { applyRule } = await import("@/domain/rule-engine");
          const matchedMessages = applyRule(messages, rule);

          if (matchedMessages.length === 0) continue;

          // 3. Move messages + apply categories
          const result = await organizeMessages(accessToken, matchedMessages, rule);

          // 4. Log results
          await createLog({
            userId: user._id,
            ruleId: rule._id,
            ruleName: rule.name,
            status: result.stats.failed > 0 ? "partial" : "success",
            stats: result.stats,
            startedAt,
            finishedAt: new Date(),
          });

          summary.push({ user: user.email, rule: rule.name, ...result.stats });
        } catch (ruleErr: any) {
          console.error(`[cron] Error processing rule ${rule.name} for user ${user.email}:`, ruleErr);
          await createLog({
            userId: user._id,
            ruleId: rule._id,
            ruleName: rule.name,
            status: "error",
            stats: { matched: 0, moved: 0, deleted: 0, skipped: 0, failed: 0 },
            errorMessage: ruleErr.message,
            startedAt,
            finishedAt: new Date(),
          });
        }
      }
    } catch (userErr) {
      console.error(`[cron] Error for user ${user.email}:`, userErr);
    }
  }

  return NextResponse.json({ success: true, summary });
}
