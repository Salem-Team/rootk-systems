"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CrmDateTimeField } from "@/components/crm/crm-datetime-field";
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
import { cn } from "@/lib/utils";
import type { CrmCallStatus, CrmNextAction } from "@/types/crm";
import type { PendingCrmCall } from "@/lib/crm/pending-call";

interface CrmPostCallDialogProps {
  pending: PendingCrmCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}

const OUTCOMES: Array<{
  status: CrmCallStatus;
  key: "answered" | "noAnswer" | "missed";
}> = [
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

  const durationLabel = pending
    ? formatCallClock(pendingCallDurationSeconds(pending))
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-md",
          // Short phones: keep sheet within viewport; body scrolls.
          "max-h-[min(94dvh,100%)]"
        )}
      >
        <DialogHeader className="gap-1 px-4 pb-3 pt-1 sm:px-5 sm:pb-4">
          <DialogTitle className="text-[1.05rem] leading-snug sm:text-lg">
            {t("crm.call.title")}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed sm:text-sm">
            {pending
              ? t("crm.call.desc", { name: pending.leadName })
              : t("crm.call.descFallback")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3.5 px-4 pb-3 sm:space-y-4 sm:px-5">
          <div
            role="group"
            aria-label={t("crm.call.title")}
            className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3"
          >
            {OUTCOMES.map((item) => {
              const active = status === item.status;
              return (
                <Button
                  key={item.status}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-12 touch-manipulation whitespace-normal px-2.5 py-2.5 text-center text-[12.5px] font-semibold leading-tight sm:min-h-11 sm:text-[13px]",
                    active && "shadow-[var(--shadow-card)]"
                  )}
                  aria-pressed={active}
                  onClick={() => setStatus(item.status)}
                >
                  {t(`crm.call.${item.key}`)}
                </Button>
              );
            })}
          </div>

          {pending && durationLabel ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5 text-[13px] text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {t(
                  pending.osConfirmed
                    ? "crm.call.talkDuration"
                    : "crm.call.duration"
                )}
              </span>
              <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                {durationLabel}
              </span>
            </div>
          ) : null}

          <CrmDateTimeField
            id="post-call-follow"
            label={t("crm.call.followUp")}
            value={followAt}
            onChange={setFollowAt}
          />

          <div className="space-y-2">
            <Label
              htmlFor="post-call-notes"
              className="text-[13px] font-medium"
            >
              {t("crm.call.notes")}
            </Label>
            <Textarea
              id="post-call-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[5.5rem] touch-manipulation resize-none text-[16px] leading-relaxed sm:text-sm"
            />
          </div>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 border-t border-border/60 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 sm:flex-col sm:justify-stretch sm:px-5">
          <Button
            className="min-h-12 w-full touch-manipulation text-[15px] font-semibold sm:min-h-11 sm:text-sm"
            onClick={() => void submit()}
            disabled={saving || !pending}
          >
            {saving ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {t("crm.call.save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full touch-manipulation text-[13px] text-muted-foreground hover:text-foreground"
            disabled={saving || !pending}
            onClick={() => void handleOpenChange(false)}
          >
            {t("crm.call.skip")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
