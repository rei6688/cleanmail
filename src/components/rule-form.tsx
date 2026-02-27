"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createRuleAction, updateRuleAction } from "@/actions/rules";
import type { IRule } from "@/types";
import type { CreateRuleInput } from "@/schemas/rule";

interface Props {
  rule?: IRule;
}

function tagsInput(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function RuleForm({ rule }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(rule?.name ?? "");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [senders, setSenders] = useState(
    rule?.conditions.senders.join(", ") ?? ""
  );
  const [subjectKeywords, setSubjectKeywords] = useState(
    rule?.conditions.subjectKeywords.join(", ") ?? ""
  );
  const [bodyKeywords, setBodyKeywords] = useState(
    rule?.conditions.bodyKeywords.join(", ") ?? ""
  );
  const [excludeKeywords, setExcludeKeywords] = useState(
    rule?.conditions.excludeKeywords.join(", ") ?? ""
  );
  const [readFilter, setReadFilter] = useState<"read" | "unread" | "any">(
    rule?.conditions.readFilter ?? "any"
  );
  const [sourceFolders, setSourceFolders] = useState(
    rule?.conditions.sourceFolders.join(", ") ?? ""
  );
  const [targetFolder, setTargetFolder] = useState(rule?.targetFolder ?? "");
  const [categoryPolicy, setCategoryPolicy] = useState<
    "add" | "replace" | "remove" | "none"
  >(rule?.categoryAction.policy ?? "none");
  const [categories, setCategories] = useState(
    rule?.categoryAction.categories.join(", ") ?? ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data: CreateRuleInput = {
      name,
      enabled,
      conditions: {
        senders: tagsInput(senders),
        subjectKeywords: tagsInput(subjectKeywords),
        bodyKeywords: tagsInput(bodyKeywords),
        excludeKeywords: tagsInput(excludeKeywords),
        readFilter,
        sourceFolders: tagsInput(sourceFolders),
      },
      targetFolder,
      categoryAction: {
        policy: categoryPolicy,
        categories: tagsInput(categories),
      },
    };

    const result = rule
      ? await updateRuleAction(String(rule._id), data)
      : await createRuleAction(data);

    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/rules");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Rule Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Archive newsletters"
          required
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <Label htmlFor="enabled">Enabled</Label>
      </div>

      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold text-gray-700">
          Conditions
        </legend>
        <div className="mt-3 space-y-4">
          <div className="space-y-2">
            <Label>Senders (comma-separated)</Label>
            <Input
              value={senders}
              onChange={(e) => setSenders(e.target.value)}
              placeholder="newsletter@example.com, noreply@shop.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject keywords (comma-separated)</Label>
            <Input
              value={subjectKeywords}
              onChange={(e) => setSubjectKeywords(e.target.value)}
              placeholder="unsubscribe, weekly digest"
            />
          </div>
          <div className="space-y-2">
            <Label>Body keywords (comma-separated)</Label>
            <Input
              value={bodyKeywords}
              onChange={(e) => setBodyKeywords(e.target.value)}
              placeholder="promo code, discount, receipt"
            />
          </div>
          <div className="space-y-2">
            <Label>Exclude keywords (comma-separated)</Label>
            <Input
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              placeholder="urgent, invoice"
            />
          </div>
          <div className="space-y-2">
            <Label>Read status</Label>
            <Select
              value={readFilter}
              onValueChange={(v) =>
                setReadFilter(v as "read" | "unread" | "any")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="read">Read only</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source folders (comma-separated, empty = inbox)</Label>
            <Input
              value={sourceFolders}
              onChange={(e) => setSourceFolders(e.target.value)}
              placeholder="inbox, drafts"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold text-gray-700">
          Actions
        </legend>
        <div className="mt-3 space-y-4">
          <div className="space-y-2">
            <Label>Target folder *</Label>
            <Input
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              placeholder="Archive"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Category policy</Label>
            <Select
              value={categoryPolicy}
              onValueChange={(v) =>
                setCategoryPolicy(v as "add" | "replace" | "remove" | "none")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="add">Add categories</SelectItem>
                <SelectItem value="replace">Replace categories</SelectItem>
                <SelectItem value="remove">Remove categories</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {categoryPolicy !== "none" && (
            <div className="space-y-2">
              <Label>Categories (comma-separated)</Label>
              <Input
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="Newsletter, Automated"
              />
            </div>
          )}
        </div>
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : rule ? "Update Rule" : "Create Rule"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/rules")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
