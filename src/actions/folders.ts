"use server";

import { auth } from "@/lib/auth";
import { getOAuthAccount } from "@/repositories/oauth-accounts";
import { getValidToken } from "@/infra/token-refresh";
import { findUserByMicrosoftId } from "@/repositories/users";
import * as graph from "@/infra/graph-client";
import type { Types } from "mongoose";

export async function getMailFoldersOptionTree(): Promise<{ label: string; value: string; isSub?: boolean }[]> {
    const session = await auth();
    const microsoftId = (session?.user as any)?.microsoftId;
    if (!microsoftId) return [];

    try {
        const user = await findUserByMicrosoftId(microsoftId);
        if (!user) return [];

        const oauthAccount = await getOAuthAccount(user._id as Types.ObjectId);
        if (!oauthAccount) return [];

        const { accessToken } = await getValidToken(
            oauthAccount,
            user._id as Types.ObjectId
        );

        const folders = await graph.listMailFolders(accessToken);
        const options: { label: string; value: string; isSub?: boolean }[] = [];

        const skipFolders = [
            "deleteditems", "junkemail", "sentitems", "drafts", "outbox",
            "conversationhistory", "snoozed", "syncissues", "rssfeeds"
        ];

        // Build tree or flat list
        for (const f of folders) {
            const normalizedName = f.displayName.toLowerCase().replace(/\s/g, "");
            const shouldSkipRoot = skipFolders.some(skip =>
                normalizedName === skip ||
                normalizedName.startsWith(skip)
            );

            if (shouldSkipRoot) continue;

            options.push({ label: f.displayName, value: f.displayName });

            try {
                const childFolders = await graph.listChildFolders(accessToken, f.id);
                for (const c of childFolders) {
                    options.push({
                        label: `  ↳ ${c.displayName}`,
                        value: `${f.displayName}/${c.displayName}`,
                        isSub: true
                    });
                }
            } catch (e) {
                // Ignore
            }
        }

        return options;
    } catch (e) {
        console.error("Failed to fetch folders", e);
        return [];
    }
}
