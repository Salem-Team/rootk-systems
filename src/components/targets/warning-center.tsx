"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { SoftListRow } from "@/components/shared/meta-chip";
import {
  acknowledgeTargetWarning,
  getTargetWarnings,
  sendTargetWarning,
} from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { emitTargetsUpdated } from "@/lib/events";
import { canTarget } from "@/lib/target-policies";
import { getWorkEmployeeId, useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
  PerformanceTarget,
  TargetPenaltyType,
  TargetWarning,
} from "@/types/targets";

const PENALTY_TYPES: TargetPenaltyType[] = [
  "written_warning",
  "performance_note",
  "salary_deduction",
  "bonus_reduction",
  "manager_review",
  "custom",
];

function emptyForm() {
  return {
    targetId: "",
    employeeId: "",
    reason: "",
    managerNotes: "",
    requiredAction: "",
    penaltyType: "written_warning" as TargetPenaltyType,
    penaltyNote: "",
  };
}

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
  const [form, setForm] = useState(emptyForm);
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

  const selectedTarget = targetMap.get(form.targetId);

  function openCreate() {
    setForm(emptyForm());
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
              {warnings.map((warning) => {
                const target = targetMap.get(warning.targetId);
                const isMine = warning.employeeId === getWorkEmployeeId();
                return (
                  <SoftListRow key={warning.id} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {target?.title ?? warning.targetId}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {employees.get(warning.employeeId)?.name ?? warning.employeeId}
                          {" · "}
                          {format(parseISO(warning.createdAt), "d MMM yyyy", {
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                      <Badge variant="warning">
                        {t(`targets.warnings.penaltyTypes.${warning.penaltyType}`)}
                      </Badge>
                    </div>
                    <p className="text-[13px] leading-relaxed">{warning.reason}</p>
                    {warning.requiredAction ? (
                      <p className="text-[12px] text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {t("targets.warnings.requiredAction")}:
                        </span>{" "}
                        {warning.requiredAction}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      {warning.acknowledgedAt ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          {t("targets.warnings.acknowledgedAt", {
                            date: format(parseISO(warning.acknowledgedAt), "d MMM yyyy", {
                              locale: dateLocale,
                            }),
                          })}
                        </span>
                      ) : isMine ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === warning.id}
                          onClick={() => void onAcknowledge(warning.id)}
                        >
                          {busyId === warning.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {t("targets.warnings.acknowledge")}
                        </Button>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">
                          {t("targets.warnings.pendingAck")}
                        </span>
                      )}
                    </div>
                  </SoftListRow>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("targets.warnings.send")}</SheetTitle>
            <SheetDescription>{t("targets.warnings.sendDesc")}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3.5 py-4">
            <div className="space-y-1.5">
              <Label>{t("targets.warnings.target")}</Label>
              <Select value={form.targetId} onValueChange={onTargetChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("targets.warnings.target")} />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((tg) => (
                    <SelectItem key={tg.id} value={tg.id}>
                      {tg.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("targets.warnings.employee")}</Label>
              <Select
                value={form.employeeId}
                onValueChange={(employeeId) => setForm((f) => ({ ...f, employeeId }))}
                disabled={!selectedTarget}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("targets.warnings.employee")} />
                </SelectTrigger>
                <SelectContent>
                  {(selectedTarget?.assigneeIds ?? []).map((id) => (
                    <SelectItem key={id} value={id}>
                      {employees.get(id)?.name ?? id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("targets.warnings.reason")}</Label>
              <Textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("targets.warnings.managerNotes")}</Label>
              <Textarea
                rows={2}
                value={form.managerNotes}
                onChange={(e) => setForm((f) => ({ ...f, managerNotes: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("targets.warnings.requiredAction")}</Label>
              <Input
                value={form.requiredAction}
                onChange={(e) => setForm((f) => ({ ...f, requiredAction: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label>{t("targets.warnings.penaltyType")}</Label>
                <Select
                  value={form.penaltyType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, penaltyType: v as TargetPenaltyType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PENALTY_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {t(`targets.warnings.penaltyTypes.${pt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("targets.warnings.penaltyNote")}</Label>
                <Input
                  value={form.penaltyNote}
                  onChange={(e) => setForm((f) => ({ ...f, penaltyNote: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={saving} onClick={() => void onSend()}>
              {saving ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
              {t("targets.warnings.send")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
