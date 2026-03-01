"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Wrench,
    Trash2,
    Layers,
    Tags,
    ChevronRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FolderTree
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    flattenInbox,
    clearOutlookRules,
    clearCategories,
    clearInboxSubfolders,
    setupSmartFolderTree
} from "@/actions/maintenance";
import { cn } from "@/lib/utils";

type Tool = {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bg: string;
    action?: () => Promise<{ success: boolean; count?: number; error?: string }>;
    disabled?: boolean;
};

const tools: Tool[] = [
    {
        id: "flatten",
        title: "Flatten Subfolders",
        description: "Move all emails from subfolders back to your Inbox for a fresh start.",
        icon: Layers,
        color: "text-blue-600",
        bg: "bg-blue-50",
        action: flattenInbox,
    },
    {
        id: "rules",
        title: "Clear Outlook Rules",
        description: "Delete all existing message rules currently configured in Outlook.",
        icon: Trash2,
        color: "text-rose-600",
        bg: "bg-rose-50",
        action: clearOutlookRules,
    },
    {
        id: "categories",
        title: "Remove Tags & Categories",
        description: "Clear all assigned categories and tags from your master list.",
        icon: Tags,
        color: "text-amber-600",
        bg: "bg-amber-50",
        action: clearCategories,
    },
    {
        id: "clear_folders",
        title: "Clear Custom Folders",
        description: "Permanently delete all custom folders you created (e.g., MailOrganized, 00_Urgent). Best used after flattening.",
        icon: Trash2,
        color: "text-purple-600",
        bg: "bg-purple-50",
        action: clearInboxSubfolders,
    },
    {
        id: "tree",
        title: "Smart Folder Tree",
        description: "Automatically generate an optimized folder structure for banking.",
        icon: FolderTree,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        action: setupSmartFolderTree,
    },
];

export default function MaintenancePage() {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, { success: boolean, msg: string }>>({});

    const handleAction = async (tool: typeof tools[0]) => {
        if (!tool.action) return;
        setLoadingId(tool.id);

        try {
            const res = await tool.action();
            if (res.success) {
                setResults(prev => ({
                    ...prev,
                    [tool.id]: { success: true, msg: `Success! Handled ${res.count} items.` }
                }));
            } else {
                setResults(prev => ({
                    ...prev,
                    [tool.id]: { success: false, msg: res.error || "Operation failed" }
                }));
            }
        } catch (err) {
            setResults(prev => ({
                ...prev,
                [tool.id]: { success: false, msg: "Unexpected error occurred" }
            }));
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1"
            >
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl flex items-center gap-3">
                    <Wrench className="h-8 w-8 text-indigo-600" />
                    Maintenance
                </h1>
                <p className="text-gray-500">
                    Powerful tools to prepare and clean your inbox before applying automation rules.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tools.map((tool, i) => (
                    <motion.div
                        key={tool.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className={cn(
                            "group overflow-hidden border-white/20 backdrop-blur-md bg-white/50 transition-all hover:shadow-xl",
                            tool.disabled && "opacity-60 cursor-not-allowed"
                        )}>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className={cn("p-3 rounded-2xl transition-colors", tool.bg, !tool.disabled && "group-hover:bg-indigo-600 group-hover:text-white")}>
                                    <tool.icon className={cn("h-6 w-6 transition-colors", tool.color, !tool.disabled && "group-hover:text-white")} />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                                    <CardDescription className="text-xs">{tool.description}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {results[tool.id] ? (
                                    <div className={cn(
                                        "flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-medium",
                                        results[tool.id].success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                    )}>
                                        {results[tool.id].success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                        {results[tool.id].msg}
                                    </div>
                                ) : null}

                                <Button
                                    className="w-full justify-between"
                                    variant={tool.disabled ? "secondary" : "default"}
                                    disabled={tool.disabled || loadingId !== null}
                                    onClick={() => handleAction(tool)}
                                >
                                    {loadingId === tool.id ? (
                                        <>Running...</>
                                    ) : (
                                        <>
                                            Run Tool
                                            <ChevronRight className="h-4 w-4" />
                                        </>
                                    )}
                                    {loadingId === tool.id && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-6"
            >
                <div className="flex gap-4">
                    <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-amber-900">Important Warning</p>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            These operations are <strong>destructive</strong> to your Outlook configuration (but not your emails themselves, which are moved to Inbox).
                            Backup your rules manually if you need to keep them before running "Clear Outlook Rules".
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
