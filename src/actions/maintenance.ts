"use server";

import { auth } from "@/lib/auth";
import { getOAuthAccount } from "@/repositories/oauth-accounts";
import { getValidToken } from "@/infra/token-refresh";
import { findUserByMicrosoftId } from "@/repositories/users";
import * as graph from "@/infra/graph-client";
import { revalidatePath } from "next/cache";
import type { Types } from "mongoose";

export async function flattenInbox() {
    const session = await auth();
    const microsoftId = (session?.user as any)?.microsoftId;
    if (!microsoftId) return { success: false, error: "Not authenticated" };

    try {
        const user = await findUserByMicrosoftId(microsoftId);
        if (!user) return { success: false, error: "User not found" };

        const oauthAccount = await getOAuthAccount(user._id as Types.ObjectId);
        if (!oauthAccount) return { success: false, error: "No OAuth account found" };

        const { accessToken } = await getValidToken(
            oauthAccount,
            user._id as Types.ObjectId
        );
        const folders = await graph.listMailFolders(accessToken);

        const inboxId = await graph.getFolderIdByName(accessToken, "Inbox");
        if (!inboxId) return { success: false, error: "Inbox not found" };

        // Well-known folders to skip
        const skipFolders = [
            "inbox", "junkemail", "deleteditems", "sentitems", "drafts", "outbox",
            "archive", "conversationhistory", "snoozed", "syncissues", "rssfeeds"
        ];

        let movedCount = 0;
        for (const folder of folders) {
            if (skipFolders.includes(folder.displayName.toLowerCase().replace(" ", ""))) continue;

            // Fetch all messages in this folder and move to inbox
            let nextLink: string | undefined;
            do {
                const result: { value: any[]; nextLink?: string } = await graph.listMessages(accessToken, {
                    folder: folder.id,
                    top: 50
                });

                for (const msg of result.value) {
                    await graph.moveMessage(accessToken, msg.id, inboxId);
                    movedCount++;
                }
                nextLink = result.nextLink;
            } while (nextLink);
        }

        revalidatePath("/dashboard");
        return { success: true, count: movedCount };
    } catch (error: any) {
        console.error("Flatten Error:", error);
        return { success: false, error: error.message };
    }
}

export async function clearOutlookRules() {
    const session = await auth();
    const microsoftId = (session?.user as any)?.microsoftId;
    if (!microsoftId) return { success: false, error: "Not authenticated" };

    try {
        const user = await findUserByMicrosoftId(microsoftId);
        if (!user) return { success: false, error: "User not found" };

        const oauthAccount = await getOAuthAccount(user._id as Types.ObjectId);
        if (!oauthAccount) return { success: false, error: "No OAuth account found" };

        const { accessToken } = await getValidToken(
            oauthAccount,
            user._id as Types.ObjectId
        );
        const rules = await graph.listOutlookRules(accessToken);

        for (const rule of rules) {
            await graph.deleteOutlookRule(accessToken, rule.id);
        }

        return { success: true, count: rules.length };
    } catch (error: any) {
        console.error("Clear Rules Error:", error);
        return { success: false, error: error.message };
    }
}

export async function clearCategories() {
    const session = await auth();
    const microsoftId = (session?.user as any)?.microsoftId;
    if (!microsoftId) return { success: false, error: "Not authenticated" };

    try {
        const user = await findUserByMicrosoftId(microsoftId);
        if (!user) return { success: false, error: "User not found" };

        const oauthAccount = await getOAuthAccount(user._id as Types.ObjectId);
        if (!oauthAccount) return { success: false, error: "No OAuth account found" };

        const { accessToken } = await getValidToken(
            oauthAccount,
            user._id as Types.ObjectId
        );
        const categories = await graph.listCategories(accessToken);

        for (const cat of categories) {
            await graph.deleteCategory(accessToken, cat.id);
        }

        return { success: true, count: categories.length };
    } catch (error: any) {
        console.error("Clear Categories Error:", error);
        return { success: false, error: error.message };
    }
}
export async function clearInboxSubfolders() {
    const session = await auth();
    const microsoftId = (session?.user as any)?.microsoftId;
    if (!microsoftId) return { success: false, error: "Not authenticated" };

    try {
        const user = await findUserByMicrosoftId(microsoftId);
        if (!user) return { success: false, error: "User not found" };

        const oauthAccount = await getOAuthAccount(user._id as Types.ObjectId);
        if (!oauthAccount) return { success: false, error: "No OAuth account found" };

        const { accessToken } = await getValidToken(
            oauthAccount,
            user._id as Types.ObjectId
        );

        const folders = await graph.listMailFolders(accessToken);

        const skipFolders = [
            "inbox", "junkemail", "deleteditems", "sentitems", "drafts", "outbox",
            "archive", "conversationhistory", "snoozed", "syncissues", "rssfeeds"
        ];

        let deleteCount = 0;
        for (const folder of folders) {
            const normalizedName = folder.displayName.toLowerCase().replace(/\s/g, "");
            if (skipFolders.includes(normalizedName)) continue;

            try {
                await graph.deleteMailFolder(accessToken, folder.id);
                deleteCount++;
            } catch (err: any) {
                console.error(`Failed to delete folder ${folder.displayName}:`, err.message);
            }
        }

        return { success: true, count: deleteCount };
    } catch (error: any) {
        console.error("Clear Subfolders Error:", error);
        return { success: false, error: error.message };
    }
}

export async function setupSmartFolderTree() {
    const session = await auth();
    const microsoftId = (session?.user as any)?.microsoftId;
    if (!microsoftId) return { success: false, error: "Not authenticated" };

    try {
        const user = await findUserByMicrosoftId(microsoftId);
        if (!user) return { success: false, error: "User not found" };

        const oauthAccount = await getOAuthAccount(user._id as Types.ObjectId);
        if (!oauthAccount) return { success: false, error: "No OAuth account found" };

        const { accessToken } = await getValidToken(
            oauthAccount,
            user._id as Types.ObjectId
        );

        const rootFolders = [
            "00_Urgent_OTP",
            "01_Banking_Statements",
            "02_Banking_Activity",
            "03_Credit_Rewards"
        ];

        const banks = ["VCB", "MB", "TPBank"];
        const foldersNeedBanks = [
            "01_Banking_Statements",
            "02_Banking_Activity",
            "03_Credit_Rewards"
        ];

        let createdCount = 0;
        let existingFolders = await graph.listMailFolders(accessToken);

        // 1. Create root folders
        for (const name of rootFolders) {
            const exists = existingFolders.find(f => f.displayName.toLowerCase() === name.toLowerCase());
            if (!exists) {
                await graph.createMailFolder(accessToken, name);
                createdCount++;
            }
        }

        // Re-fetch to get IDs of newly created roots
        existingFolders = await graph.listMailFolders(accessToken);

        // 2. Create subfolders for banks
        for (const rootName of foldersNeedBanks) {
            const parentFolder = existingFolders.find(f => f.displayName.toLowerCase() === rootName.toLowerCase());
            if (!parentFolder) continue;

            // Fetch existing child folders to avoid duplicates
            const childFolders = await graph.listChildFolders(accessToken, parentFolder.id);
            const childNames = childFolders.map(c => c.displayName.toLowerCase());

            for (const bank of banks) {
                if (!childNames.includes(bank.toLowerCase())) {
                    await graph.createMailFolder(accessToken, bank, parentFolder.id);
                    createdCount++;
                }
            }
        }

        return { success: true, count: createdCount };
    } catch (error: any) {
        console.error("Setup Tree Error:", error);
        return { success: false, error: error.message };
    }
}
