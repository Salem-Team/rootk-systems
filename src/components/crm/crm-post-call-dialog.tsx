"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { recordCrmLeadCall } from "@/services/crm.service";
import { crmUserFacingMessage } from "@/lib/crm/client-error";
import { nativePlatform } from "@/lib/native/platform";
import type { CrmCallStatus, CrmNextAction } from "@/types/crm";
import type { PendingCrmCall } from "@/lib/crm/pending-call";

interface CrmPostCallDialogProps {
  pending: PendingCrmCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}

const OUTCOMES: Array<{ status: CrmCallStatus; key: "answered" | "noAnswer" | "missed" }> = [
  { status: "answered", key: "answered" },
  { status: "unknown", key: "noAnswer" },
  { status: "missed", key: "missed" },
];

/** Fast post-dial result capture. Writes Call + Feedback so existing KPIs stay correct. */
export function CrmPostCallDialog({
  pending,
  open,
  onOpenChange,
  onRecorded,
}: CrmPostCallDialogProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CrmCallStatus>("answered");
  const [notes, setNotes] = useState("");
  const [followAt, setFollowAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!pending) return;
    setSaving(true);
    const nextAction: CrmNextAction = followAt ? "follow_up" : "none";
    const res = await recordCrmLeadCall(pending.leadId, {
      status: status === "unknown" ? "unknown" : status,
      direction: "outgoing",
      source: pending.source === "web" ? nativePlatform() === "web" ? "web" : nativePlatform() : pending.source,
      externalCallId: pending.externalCallId,
      phoneNumber: pending.phone,
      startedAt: pending.startedAt,
      endedAt: new Date().toISOString(),
      notes,
      nextAction,
      nextFollowUpAt: followAt ? new Date(followAt).toISOString() : null,
    });
    setSaving(false);
    if (!res.success) {
      const already =
        res.error?.details &&
        typeof res.error.details === "object" &&
        ("alreadySynchronized" in res.error.details ||
          (res.error.details as { code?: string }).code === "CALL_DUPLICATE");
      if (already) {
        toast.success(t("crm.call.alreadySaved"));
        onOpenChange(false);
        onRecorded?.();
        return;
      }
      toast.error(crmUserFacingMessage(res, t, "crm.call.saveFailed"));
      return;
    }
    toast.success(t("crm.call.saved"));
    onOpenChange(false);
    setNotes("");
    setFollowAt("");
    onRecorded?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("crm.call.title")}</DialogTitle>
          <DialogDescription>
            {pending
              ? t("crm.call.desc", { name: pending.leadName })
              : t("crm.call.descFallback")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {OUTCOMES.map((item) => (
            <Button
              key={item.status}
              type="button"
              variant={status === item.status ? "default" : "outline"}
              className="min-h-11 text-[13px]"
              aria-pressed={status === item.status}
              onClick={() => setStatus(item.status)}
            >
              {t(`crm.call.${item.key}`)}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="post-call-follow">{t("crm.call.followUp")}</Label>
          <Input
            id="post-call-follow"
            type="datetime-local"
            value={followAt}
            onChange={(e) => setFollowAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="post-call-notes">{t("crm.call.notes")}</Label>
          <Textarea
            id="post-call-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            {t("crm.actions.cancel")}
          </Button>
          <Button className="min-h-11" onClick={() => void submit()} disabled={saving || !pending}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("crm.call.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
