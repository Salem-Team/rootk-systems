"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { MetaChip } from "@/components/shared/meta-chip";
import { approveLeave, rejectLeave } from "@/services/leave.service";
import { useTranslation } from "@/hooks/use-translation";
import { emitLeaveUpdated } from "@/lib/events";
import { fadeInUp } from "@/lib/animations";
import {
  leaveNoteKey,
  leaveReasonKey,
  translateOrFallback,
} from "@/lib/i18n-content";
import { cn, getInitials } from "@/lib/utils";
import type { Employee, LeaveRequest } from "@/types";

const STATUS_EDGE: Record<LeaveRequest["status"], string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-rose-500",
};

interface LeaveCardProps {
  request: LeaveRequest;
  employee?: Employee;
  showActions?: boolean;
  onUpdated?: (request: LeaveRequest) => void;
}

export function LeaveCard({
  request,
  employee,
  showActions = false,
  onUpdated,
}: LeaveCardProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const typeLabel = t(`leaveTypes.${request.type}`);
  const canAct = showActions && request.status === "pending";

  async function handleApprove() {
    setBusy("approve");
    try {
      const res = await approveLeave(request.id);
      if (!res.success) {
        toast.error(t("common.error"));
        return;
      }
      toast.success(t("leave.approvedToast"));
      emitLeaveUpdated();
      onUpdated?.(res.data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  async function handleRejectConfirm() {
    const note = rejectNote.trim();
    if (note.length < 3) {
      toast.error(t("leave.noteRequired"));
      return;
    }
    setBusy("reject");
    try {
      const res = await rejectLeave(request.id, note);
      if (!res.success) {
        toast.error(t("common.error"));
        return;
      }
      toast.success(t("leave.rejectedToast"));
      emitLeaveUpdated();
      onUpdated?.(res.data);
      setRejectOpen(false);
      setRejectNote("");
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  const reviewerNote = request.reviewerNote
    ? translateOrFallback(t, leaveNoteKey(request.id), request.reviewerNote)
    : null;

  return (
    <motion.div variants={fadeInUp}>
      <article className="surface-panel surface-panel-interactive relative overflow-hidden transition-[transform,box-shadow] duration-200">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-3 start-0 w-0.5 rounded-full",
            STATUS_EDGE[request.status]
          )}
        />
        <div className="p-4 ps-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <Avatar className="h-9 w-9 ring-1 ring-border">
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials(employee?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">
                  {employee?.name ?? "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {employee?.department
                    ? t(`departments.${employee.department}`)
                    : "—"}{" "}
                  · {typeLabel}
                </p>
              </div>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <div className="relative mt-3.5 grid gap-2 sm:grid-cols-3">
            <MetaChip
              label={t("common.from")}
              value={format(parseISO(request.startDate), "MMM d, yyyy", {
                locale: dateLocale,
              })}
            />
            <MetaChip
              label={t("common.to")}
              value={format(parseISO(request.endDate), "MMM d, yyyy", {
                locale: dateLocale,
              })}
            />
            <MetaChip
              label={t("common.days")}
              value={t("leave.daysCount", { count: request.days })}
            />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {translateOrFallback(
              t,
              leaveReasonKey(request.id),
              request.reason
            )}
          </p>

          {reviewerNote && request.status !== "pending" ? (
            <div className="mt-3 rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
              <p className="section-label">{t("leave.reviewerNote")}</p>
              <p className="mt-1 text-sm text-foreground">{reviewerNote}</p>
            </div>
          ) : null}

          <p className="mt-2.5 text-[11px] text-muted-foreground">
            {format(parseISO(request.submittedAt), "MMM d, yyyy · HH:mm", {
              locale: dateLocale,
            })}
          </p>

          {canAct ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={handleApprove}
                disabled={!!busy}
              >
                {busy === "approve" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check />
                )}
                {t("common.approve")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRejectOpen(true)}
                disabled={!!busy}
              >
                <X />
                {t("common.reject")}
              </Button>
            </div>
          ) : null}
        </div>
      </article>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("leave.rejectTitle")}</DialogTitle>
            <DialogDescription>{t("leave.rejectDesc")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder={t("leave.rejectPlaceholder")}
            rows={4}
            className="resize-none"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={busy === "reject"}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRejectConfirm()}
              disabled={busy === "reject"}
            >
              {busy === "reject" ? (
                <Loader2 className="animate-spin" />
              ) : null}
              {t("leave.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
