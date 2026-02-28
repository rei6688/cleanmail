"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Folder, ChevronRight, ChevronDown, LayoutGrid, List } from "lucide-react";
import { RuleActions } from "@/components/rule-actions";
import type { IRule } from "@/types";
import Link from "next/link";

interface Props {
    rules: IRule[];
}

export function RuleList({ rules }: Props) {
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"all" | "folder">("folder");
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "Root": true });

    const filteredRules = useMemo(() => {
        return rules.filter(r =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.action?.targetFolder?.toLowerCase().includes(search.toLowerCase()) ||
            r.conditions.senders.some(s => s.toLowerCase().includes(search.toLowerCase()))
        );
    }, [rules, search]);

    const folderGroups = useMemo(() => {
        const groups: Record<string, IRule[]> = { "Root": [] };

        filteredRules.forEach(rule => {
            const folder = rule.action?.targetFolder || (rule as any).targetFolder || "Archive";
            const rootFolder = folder.split("/")[0] || "Root";
            if (!groups[rootFolder]) groups[rootFolder] = [];
            groups[rootFolder].push(rule);
        });

        return groups;
    }, [filteredRules]);

    const toggleFolder = (name: string) => {
        setExpandedFolders(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const renderRuleCard = (rule: IRule) => (
        <Card key={String(rule._id)} className="hover:border-blue-200 transition-colors">
            <CardContent className="flex items-start justify-between p-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{rule.name}</h3>
                        <Badge variant={rule.enabled ? "success" : "secondary"} className="text-[10px] h-4">
                            {rule.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                        → <span className="text-blue-600 font-medium">{rule.action?.targetFolder || "Archive"}</span>
                        {rule.conditions.senders.length > 0 &&
                            ` · from: ${rule.conditions.senders.slice(0, 1).join(", ")}${rule.conditions.senders.length > 1 ? "…" : ""}`}
                    </p>
                    <div className="mt-1 flex gap-2 overflow-hidden">
                        {rule.categoryAction.categories.map(c => (
                            <span key={c} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 uppercase font-bold tracking-tighter">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="ml-4 shrink-0">
                    <RuleActions
                        ruleId={String(rule._id)}
                        enabled={rule.enabled}
                    />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search rules by name, sender, folder..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setView("folder")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "folder" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Folders
                    </button>
                    <button
                        onClick={() => setView("all")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <List className="h-4 w-4" />
                        All Rules
                    </button>
                </div>
            </div>

            {view === "all" ? (
                <div className="grid gap-3">
                    {filteredRules.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No matching rules found.</div>
                    ) : (
                        filteredRules.map(renderRuleCard)
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(folderGroups).length === 1 && folderGroups["Root"].length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No rules found.</div>
                    ) : (
                        Object.entries(folderGroups).map(([folderName, folderRules]) => (
                            <div key={folderName} className="space-y-2">
                                <button
                                    onClick={() => toggleFolder(folderName)}
                                    className="flex items-center gap-2 w-full text-left font-bold text-gray-700 hover:text-blue-600 transition-colors py-1 group"
                                >
                                    {expandedFolders[folderName] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <Folder className={`h-4 w-4 ${expandedFolders[folderName] ? "fill-blue-100 text-blue-600" : "text-gray-400"}`} />
                                    <span>{folderName}</span>
                                    <span className="text-xs font-normal text-gray-400 ml-2 bg-gray-100 px-2 py-0.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500">
                                        {folderRules.length}
                                    </span>
                                </button>
                                {expandedFolders[folderName] && (
                                    <div className="grid gap-3 pl-6 border-l-2 border-gray-100 ml-2">
                                        {folderRules.map(renderRuleCard)}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
