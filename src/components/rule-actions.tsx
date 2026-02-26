"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { toggleRuleAction, deleteRuleAction } from "@/actions/rules";
import Link from "next/link";

interface Props {
  ruleId: string;
  enabled: boolean;
}

export function RuleActions({ ruleId, enabled }: Props) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle(checked: boolean) {
    setIsEnabled(checked);
    await toggleRuleAction(ruleId, checked);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this rule?")) return;
    setDeleting(true);
    await deleteRuleAction(ruleId);
    router.refresh();
    setDeleting(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        aria-label="Toggle rule"
      />
      <Link href={`/rules/${ruleId}`}>
        <Button variant="ghost" size="icon" aria-label="Edit rule">
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete rule"
        disabled={deleting}
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}
