"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Play, Loader2, Copy, Bug } from "lucide-react";
import { toggleRuleAction, deleteRuleAction, copyRuleAction } from "@/actions/rules";
import { organizeEmails } from "@/actions/organize";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/common/color-picker";
import { TagBadge } from "@/components/common/tag-badge";

import { COLOR_PRESETS } from "@/lib/colors";

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

  const [runDialog, setRunDialog] = useState(false);
  const [runInTarget, setRunInTarget] = useState(false);
  const [clearCategories, setClearCategories] = useState(true);
  const [tagToRemove, setTagToRemove] = useState("99Tag");
  const [tagToAdd, setTagToAdd] = useState("");
  const [tagToAddColor, setTagToAddColor] = useState("preset0");
  const [running, setRunning] = useState(false);

  async function handleRunNow() {
    setRunDialog(false);
    setRunning(true);
    const result = await organizeEmails({
      ruleId,
      monthsBack: 12,
      runInTargetFolder: runInTarget,
      onlyTagMode: runInTarget,
      removeTag: runInTarget && tagToRemove ? tagToRemove.trim() : undefined,
      addTag: runInTarget && tagToAdd ? tagToAdd.trim() : undefined,
      addTagColor: runInTarget && tagToAdd ? tagToAddColor : undefined,
      clearCategories: runInTarget && clearCategories
    });
    setRunning(false);
    if (result.success) {
      alert(`Success! Scanned: ${result.data.totalScanned}, Moved: ${result.data.totalMoved}, Deleted: ${result.data.totalDeleted}, Failed: ${result.data.totalFailed}`);
      router.refresh();
    } else {
      alert(`Error scanning: ${result.error}`);
    }
  }

  async function handleCopy() {
    const result = await copyRuleAction(ruleId);
    if (result.success) {
      router.refresh();
    } else {
      alert(`Error duplicating: ${result.error}`);
    }
  }

  const [stagingDialog, setStagingDialog] = useState(false);
  const [staging, setStaging] = useState(false);
  const [stagingTag, setStagingTag] = useState("99Tag");
  const [stagingTagColor, setStagingTagColor] = useState("preset0");

  async function handleRunStaging(onlyTagMode: boolean) {
    setStagingDialog(false);
    setStaging(true);
    const result = await organizeEmails({
      ruleId,
      monthsBack: 12, // Deep scan for testing
      stagingMode: true,
      stagingTag: stagingTag.trim() || undefined,
      stagingTagColor,
      onlyTagMode,
      overrideSourceFolders: onlyTagMode ? ["99_Staging_Review"] : undefined
    });
    setStaging(false);
    if (result.success) {
      alert(`STAGING SUCCESS!\nScanned: ${result.data.totalScanned}\nMatched items: ${result.data.totalMatched}\n${onlyTagMode ? "Items were TAGGED in 99_Staging_Review." : "Items were MOVED to 99_Staging_Review."}\nPlease check your Outlook to verify.`);
      router.refresh();
    } else {
      alert(`Staging Error: ${result.error}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        aria-label="Toggle rule"
      />
      <Button
        variant="ghost"
        size="icon"
        title="Test Match (Move to 99_Staging_Review)"
        disabled={running || staging}
        onClick={() => setStagingDialog(true)}
      >
        {staging ? (
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
        ) : (
          <Bug className="h-4 w-4 text-orange-500" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Run Real (Move to Target)"
        disabled={running || staging}
        onClick={() => setRunDialog(true)}
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin text-green-600" />
        ) : (
          <Play className="h-4 w-4 text-green-600" />
        )}
      </Button>
      <Link href={`/rules/${ruleId}`}>
        <Button variant="ghost" size="icon" aria-label="Edit rule">
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Duplicate rule"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4 text-blue-500" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete rule"
        disabled={deleting}
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>

      <Dialog open={stagingDialog} onOpenChange={setStagingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staging Test (Debug Mode)</DialogTitle>
            <DialogDescription>
              We will scan up to 12 months for matching items and move them to "99_Staging_Review" folder.
              Which Outlook Category (tag) should we apply to these items to help you find them?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stagingTag">Test Category Name</Label>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    id="stagingTag"
                    value={stagingTag}
                    onChange={(e) => setStagingTag(e.target.value)}
                    placeholder="e.g. 99Tag"
                  />
                  <div className="w-[180px]">
                    <ColorPicker value={stagingTagColor} onChange={setStagingTagColor} />
                  </div>
                </div>
                {stagingTag && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded bg-muted/20">
                    <span>Preview:</span>
                    <TagBadge name={stagingTag} colorValue={stagingTagColor} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setStagingDialog(false)} disabled={staging}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleRunStaging(true)} disabled={staging}>
              {staging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
              Chỉ Gắn Tag (Mail ở 99_)
            </Button>
            <Button onClick={() => handleRunStaging(false)} disabled={staging}>
              {staging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Dọn Dẹp & Gắn Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={runDialog} onOpenChange={setRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mặc áo vào - Run Production 🚀</DialogTitle>
            <DialogDescription>
              Bạn muốn thực thi Rules này trên dữ liệu ở đâu?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="runInTarget"
                checked={runInTarget}
                onCheckedChange={setRunInTarget}
              />
              <Label htmlFor="runInTarget" className="font-semibold cursor-pointer">
                Chỉ Update Tag trong Thư mục Đích (Không di chuyển)
              </Label>
            </div>
            {runInTarget && (
              <div className="grid gap-4 border-l-2 border-primary/20 pl-4 ml-1">
                <div className="text-sm text-yellow-600 bg-yellow-100 p-2 rounded-md mb-2">
                  Hệ thống sẽ KHÔNG quét Inbox. Nó sẽ soi trực tiếp vào folder nhận của Rules để chỉnh đốn lại Đống Tag cho gọn gàng.
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Xóa Toàn Bộ Tag Cũ</Label>
                    <div className="text-sm text-muted-foreground">
                      Xóa tất bật các màu trên email trước khi gắn loạt tag mới từ Rule settings.
                    </div>
                  </div>
                  <Switch
                    checked={clearCategories}
                    onCheckedChange={setClearCategories}
                  />
                </div>

                {!clearCategories && (
                  <div className="grid gap-2">
                    <Label htmlFor="tagToRemove">Tên Tag (Màu) cần Xóa đi</Label>
                    <div className="text-sm text-muted-foreground mb-1">
                      Nếu không xóa toàn bộ, hãy nhập tay Tag bạn cần bóc ra.
                    </div>
                    <Input
                      id="tagToRemove"
                      value={tagToRemove}
                      onChange={(e) => setTagToRemove(e.target.value)}
                      placeholder="e.g. 99Tag"
                    />
                  </div>
                )}

                <div className="grid gap-2 mt-2">
                  <Label htmlFor="tagToAdd">Tên Tag (Màu) cần Gắn thêm (Tùy chọn)</Label>
                  <div className="text-sm text-muted-foreground mb-1">
                    Ngoài Tag có sẵn trong Rule, bạn có muốn ÉP thêm Tag nào khác không?
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      id="tagToAdd"
                      value={tagToAdd}
                      onChange={(e) => setTagToAdd(e.target.value)}
                      placeholder="e.g. vib_card"
                    />
                    <div className="w-[180px]">
                      <ColorPicker value={tagToAddColor} onChange={setTagToAddColor} />
                    </div>
                  </div>
                  {tagToAdd && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded bg-muted/20 mt-2">
                      <span>Preview:</span>
                      <TagBadge name={tagToAdd} colorValue={tagToAddColor} />
                    </div>
                  )}
                </div>
              </div>
            )}
            {!runInTarget && (
              <div className="text-sm text-green-600 bg-green-100 p-2 rounded-md border border-green-200">
                ⭐ <strong>Chế độ Mặc Định:</strong> Hệ thống sẽ quét "Inbox" (hoặc thư mục khai báo trong rules) để Move và Gắn Tag.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialog(false)} disabled={running}>
              Hủy
            </Button>
            <Button onClick={handleRunNow} disabled={running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Bắt đầu Run Real
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
