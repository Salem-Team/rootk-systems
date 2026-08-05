"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Time12Input } from "@/components/ui/time-12-input";
import {
  DEFAULT_POLICY,
  type PolicyState,
} from "@/components/admin/admin-mock-data";
import {
  getWorkSchedule,
  updateWorkSchedule,
} from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { DayOfWeek } from "@/types";
import type { ScheduleAdminMetadata } from "@/types/org";
import type { TranslationPath } from "@/i18n";

const DAYS: { id: DayOfWeek; key: TranslationPath }[] = [
  { id: "sunday", key: "days.sunday" },
  { id: "monday", key: "days.monday" },
  { id: "tuesday", key: "days.tuesday" },
  { id: "wednesday", key: "days.wednesday" },
  { id: "thursday", key: "days.thursday" },
  { id: "friday", key: "days.friday" },
  { id: "saturday", key: "days.saturday" },
];

export function WorkPoliciesPanel() {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<PolicyState>(DEFAULT_POLICY);
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("18:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getWorkSchedule();
      if (!mounted) return;
      if (res.success) {
        const meta = (res.data.metadata ?? {}) as ScheduleAdminMetadata;
        const extras = meta.attendancePolicy;
        setPolicy({
          workingDays: res.data.workingDays,
          weekend: res.data.weekendDays,
          graceMinutes: res.data.gracePeriodMinutes,
          breakMinutes: res.data.breakMinutes,
          minHours: extras?.minHours ?? DEFAULT_POLICY.minHours,
          maxHours: extras?.maxHours ?? DEFAULT_POLICY.maxHours,
          overtimeAfterHours:
            extras?.overtimeAfterHours ?? DEFAULT_POLICY.overtimeAfterHours,
          lateAfterMinutes:
            extras?.lateAfterMinutes ?? DEFAULT_POLICY.lateAfterMinutes,
          halfDayHours: extras?.halfDayHours ?? DEFAULT_POLICY.halfDayHours,
        });
        setFromTime(res.data.fromTime);
        setToTime(res.data.toTime);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleDay(day: DayOfWeek, list: "workingDays" | "weekend") {
    setPolicy((prev) => {
      const has = prev[list].includes(day);
      const next = has
        ? prev[list].filter((d) => d !== day)
        : [...prev[list], day];
      return { ...prev, [list]: next };
    });
  }

  async function save() {
    setSaving(true);
    const current = await getWorkSchedule();
    const prevMeta = (current.data?.metadata ?? {}) as ScheduleAdminMetadata;
    const res = await updateWorkSchedule({
      workingDays: policy.workingDays as DayOfWeek[],
      weekendDays: policy.weekend as DayOfWeek[],
      gracePeriodMinutes: policy.graceMinutes,
      breakMinutes: policy.breakMinutes,
      fromTime,
      toTime,
      metadata: {
        ...prevMeta,
        attendancePolicy: {
          minHours: policy.minHours,
          maxHours: policy.maxHours,
          overtimeAfterHours: policy.overtimeAfterHours,
          lateAfterMinutes: policy.lateAfterMinutes,
          halfDayHours: policy.halfDayHours,
        },
      },
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("admin.policiesSaved"));
  }

  const rules = [
    {
      label: t("admin.gracePeriod"),
      key: "graceMinutes" as const,
      suffix: t("attendance.minutes"),
    },
    {
      label: t("admin.breakDuration"),
      key: "breakMinutes" as const,
      suffix: t("attendance.minutes"),
    },
    {
      label: t("admin.minHours"),
      key: "minHours" as const,
      suffix: "h",
    },
    {
      label: t("admin.maxHours"),
      key: "maxHours" as const,
      suffix: "h",
    },
    {
      label: t("admin.overtimeAfter"),
      key: "overtimeAfterHours" as const,
      suffix: "h",
    },
    {
      label: t("admin.lateAfter"),
      key: "lateAfterMinutes" as const,
      suffix: t("attendance.minutes"),
    },
    {
      label: t("admin.halfDayHours"),
      key: "halfDayHours" as const,
      suffix: "h",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.section variants={fadeInUp} className="surface-panel overflow-hidden">
        <div className="panel-header flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
              <Shield className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t("admin.workPolicies")}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("admin.workPoliciesDesc")}
            </p>
          </div>
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {t("common.save")}
          </Button>
        </div>
        <div className="panel-body space-y-5">
          <div>
            <p className="section-label mb-2">{t("admin.workingDays")}</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const on = policy.workingDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id, "workingDays")}
                    aria-pressed={on}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on
                        ? "border-primary/25 bg-primary/[0.08] text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {t(day.key)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="section-label mb-2">{t("admin.weekend")}</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const on = policy.weekend.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id, "weekend")}
                    aria-pressed={on}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {t(day.key)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fromTime">{t("common.from")}</Label>
              <Time12Input
                id="fromTime"
                value={fromTime}
                onChange={setFromTime}
                aria-label={t("common.from")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toTime">{t("common.to")}</Label>
              <Time12Input
                id="toTime"
                value={toTime}
                onChange={setToTime}
                aria-label={t("common.to")}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <div
                key={rule.key}
                className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3"
              >
                <Label htmlFor={rule.key} className="text-xs text-muted-foreground">
                  {rule.label}
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id={rule.key}
                    type="number"
                    className="h-9 font-mono tabular-nums"
                    value={policy[rule.key]}
                    onChange={(e) =>
                      setPolicy((prev) => ({
                        ...prev,
                        [rule.key]: Number(e.target.value) || 0,
                      }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {rule.suffix}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{t("admin.attendanceRules")}</Badge>
            <Badge variant="secondary">{t("admin.overtimeRules")}</Badge>
            <Badge variant="warning">{t("admin.lateRules")}</Badge>
            <Badge variant="outline">{t("admin.halfDayRules")}</Badge>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
