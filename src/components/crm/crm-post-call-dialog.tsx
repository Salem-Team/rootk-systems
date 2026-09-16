"use client";

import { useEffect, useRef, useState } from "react";
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
import { crmUserFacingMessage } from "@/lib/crm/client-error";
import { formatCallClock } from "@/lib/crm/call-duration";
import { pendingCallDurationSeconds } from "@/lib/crm/pending-call";
import {
  isPendingCallPersisted,
  persistPendingCrmCall,
} from "@/lib/crm/persist-pending-call";
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
  const recordedRef = useRef(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    recordedRef.current = false;
    setStatus(pending?.detectedStatus ?? "answered");
    setNotes("");
    setFollowAt("");
  }, [pending?.externalCallId, pending?.detectedStatus]);

  async function persist(
    nextStatus: CrmCallStatus,
    options?: { notes?: string; followAt?: string; silent?: boolean }
  ): Promise<boolean> {
    const current = pendingRef.current;
    if (!current || recordedRef.current) return true;
    setSaving(true);
    const nextAction: CrmNextAction = options?.followAt ? "follow_up" : "none";
    const res = await persistPendingCrmCall(current, {
      status: nextStatus,
      notes: options?.notes ?? "",
      nextAction,
      nextFollowUpAt: options?.followAt
        ? new Date(options.followAt).toISOString()
        : null,
    });
    setSaving(false);
    if (isPendingCallPersisted(res)) {
      recordedRef.current = true;
      if (!options?.silent) {
        toast.success(
          res.success ? t("crm.call.saved") : t("crm.call.alreadySaved")
        );
      } else if (res.success) {
        toast.success(t("crm.call.savedAuto"));
      }
      onRecorded?.();
      return true;
    }
    if (!options?.silent) {
      toast.error(crmUserFacingMessage(res, t, "crm.call.saveFailed"));
    }
    return false;
  }

  async function submit() {
    const ok = await persist(status === "unknown" ? "unknown" : status, {
      notes,
      followAt,
    });
    if (!ok) return;
    onOpenChange(false);
    setNotes("");
    setFollowAt("");
  }

  async function handleOpenChange(next: boolean) {
    if (!next && pendingRef.current && !recordedRef.current) {
      // Dismiss / escape / skip still counts the dial in user performance.
      await persist("unknown", { silent: true });
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
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
        {pending ? (
          <p className="font-mono text-[13px] tabular-nums text-muted-foreground">
            {t(pending.osConfirmed ? "crm.call.talkDuration" : "crm.call.duration")}
            : {formatCallClock(pendingCallDurationSeconds(pending))}
          </p>
        ) : null}
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
          <Button
            variant="outline"
            className="min-h-11"
            disabled={saving || !pending}
            onClick={() => void handleOpenChange(false)}
          >
            {t("crm.call.skip")}
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
