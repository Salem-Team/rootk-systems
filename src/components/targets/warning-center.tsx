"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import {
  acknowledgeTargetWarning,
  getTargetWarnings,
  sendTargetWarning,
} from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { emitTargetsUpdated } from "@/lib/events";
import { canTarget } from "@/lib/target-policies";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetWarning } from "@/types/targets";
import { WarningListItem } from "./warning-list-item";
import { emptyWarningForm, WarningSendSheet } from "./warning-send-sheet";

interface WarningCenterProps {
  targets: PerformanceTarget[];
  employees: Map<string, Employee>;
  className?: string;
}

/** Warning list — admin can send warnings, employees acknowledge their own. */
export function WarningCenter({ targets, employees, className }: WarningCenterProps) {
  const { t, locale } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const canSend = canTarget(role, "send_warnings");

  const [warnings, setWarnings] = useState<TargetWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyWarningForm);
  const [saving, setSaving] = useState(false);

  const targetMap = useMemo(() => new Map(targets.map((tg) => [tg.id, tg])), [targets]);

  const reload = useCallback(async () => {
    const res = await getTargetWarnings();
    if (res.success) setWarnings(res.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  function openCreate() {
    setForm(emptyWarningForm());
    setOpen(true);
  }

  function onTargetChange(targetId: string) {
    const target = targetMap.get(targetId);
    setForm((f) => ({
      ...f,
      targetId,
      employeeId: target?.assigneeIds[0] ?? "",
    }));
  }

  async function onSend() {
    if (!form.targetId || !form.employeeId || form.reason.trim().length < 3) {
      toast.error(t("targets.warnings.validationError"));
      return;
    }
    setSaving(true);
    const res = await sendTargetWarning({
      targetId: form.targetId,
      employeeId: form.employeeId,
      reason: form.reason.trim(),
      managerNotes: form.managerNotes.trim(),
      requiredAction: form.requiredAction.trim(),
      penaltyType: form.penaltyType,
      penaltyNote: form.penaltyNote.trim(),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setOpen(false);
    await reload();
    emitTargetsUpdated();
    toast.success(t("targets.warnings.sent"));
  }

  async function onAcknowledge(id: string) {
    setBusyId(id);
    const res = await acknowledgeTargetWarning(id);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    emitTargetsUpdated();
    toast.success(t("targets.warnings.acknowledged"));
  }

  if (loading) return <TableSkeleton rows={4} />;

  return (
    <div className={className}>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              {t("targets.warnings.title")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("targets.warnings.description")}
            </p>
          </div>
          {canSend ? (
            <Button size="sm" onClick={openCreate}>
              <Send className="h-4 w-4" />
              {t("targets.warnings.send")}
            </Button>
          ) : null}
        </div>
        <div className="panel-body">
          {warnings.length === 0 ? (
            <EmptyState compact title={t("targets.warnings.empty")} />
          ) : (
            <div className="space-y-2">
              {warnings.map((warning) => (
                <WarningListItem
                  key={warning.id}
                  warning={warning}
                  target={targetMap.get(warning.targetId)}
                  employees={employees}
                  dateLocale={dateLocale}
                  busyId={busyId}
                  onAcknowledge={onAcknowledge}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <WarningSendSheet
        open={open}
        onOpenChange={setOpen}
        targets={targets}
        employees={employees}
        form={form}
        setForm={setForm}
        onTargetChange={onTargetChange}
        saving={saving}
        onSend={onSend}
      />
    </div>
  );
}
