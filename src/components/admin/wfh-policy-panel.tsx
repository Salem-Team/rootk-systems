"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DepartmentBadge } from "@/components/employees/department-badge";
import {
  DEFAULT_WFH,
  type WfhPolicy,
} from "@/components/admin/admin-mock-data";
import {
  getWorkSchedule,
  updateWorkSchedule,
} from "@/services/schedule.service";
import { DEPARTMENTS } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { DayOfWeek, Department } from "@/types";
import type { ScheduleAdminMetadata } from "@/types/org";
import type { TranslationPath } from "@/i18n";

const DAY_OPTS: { id: DayOfWeek; key: TranslationPath }[] = [
  { id: "sunday", key: "days.sun" },
  { id: "monday", key: "days.mon" },
  { id: "tuesday", key: "days.tue" },
  { id: "wednesday", key: "days.wed" },
  { id: "thursday", key: "days.thu" },
];

export function WfhPolicyPanel() {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<WfhPolicy>(DEFAULT_WFH);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await getWorkSchedule();
      if (!mounted) return;
      if (res.success) {
        const meta = (res.data.metadata ?? {}) as ScheduleAdminMetadata;
        const extras = meta.wfhPolicy;
        setPolicy({
          enabled: extras?.enabled ?? DEFAULT_WFH.enabled,
          allowedDepartments:
            extras?.allowedDepartments ?? DEFAULT_WFH.allowedDepartments,
          allowedDays: res.data.wfhDays,
          requiresApproval:
            extras?.requiresApproval ?? DEFAULT_WFH.requiresApproval,
          monthlyQuota: extras?.monthlyQuota ?? DEFAULT_WFH.monthlyQuota,
          hybridOfficeDays:
            extras?.hybridOfficeDays ?? DEFAULT_WFH.hybridOfficeDays,
        });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleDept(dept: Department) {
    setPolicy((prev) => {
      const has = prev.allowedDepartments.includes(dept);
      return {
        ...prev,
        allowedDepartments: has
          ? prev.allowedDepartments.filter((d) => d !== dept)
          : [...prev.allowedDepartments, dept],
      };
    });
  }

  function toggleDay(day: DayOfWeek) {
    setPolicy((prev) => {
      const has = prev.allowedDays.includes(day);
      return {
        ...prev,
        allowedDays: has
          ? prev.allowedDays.filter((d) => d !== day)
          : [...prev.allowedDays, day],
      };
    });
  }

  async function save() {
    setSaving(true);
    const current = await getWorkSchedule();
    const prevMeta = (current.data?.metadata ?? {}) as ScheduleAdminMetadata;
    const res = await updateWorkSchedule({
      wfhDays: policy.allowedDays as DayOfWeek[],
      metadata: {
        ...prevMeta,
        wfhPolicy: {
          enabled: policy.enabled,
          allowedDepartments: policy.allowedDepartments,
          requiresApproval: policy.requiresApproval,
          monthlyQuota: policy.monthlyQuota,
          hybridOfficeDays: policy.hybridOfficeDays,
        },
      },
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("admin.wfhSaved"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Home className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.wfhTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.wfhDesc")}
          </p>
        </div>
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {t("common.save")}
        </Button>
      </div>
      <div className="panel-body space-y-5">
        <div className="flex items-center justify-between rounded-xl border border-border/70 px-3.5 py-3">
          <div>
            <p className="text-sm font-medium">{t("admin.wfhEnabled")}</p>
            <p className="text-xs text-muted-foreground">
              {t("admin.wfhEnabledHint")}
            </p>
          </div>
          <Switch
            checked={policy.enabled}
            onCheckedChange={(v) => setPolicy((p) => ({ ...p, enabled: v }))}
            aria-label={t("admin.wfhEnabled")}
          />
        </div>

        <div className={cn(!policy.enabled && "pointer-events-none opacity-45")}>
        <div>
          <p className="section-label mb-2">{t("admin.allowedDepartments")}</p>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => {
              const on = policy.allowedDepartments.includes(dept);
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDept(dept)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-lg transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !on && "opacity-40 grayscale"
                  )}
                >
                  <DepartmentBadge department={dept} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="section-label mb-2">{t("admin.allowedDays")}</p>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTS.map((day) => {
              const on = policy.allowedDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-primary/25 bg-primary/[0.08] text-primary"
                      : "border-border bg-muted/30 text-muted-foreground"
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
              <Label htmlFor="wfh-quota">{t("admin.wfhQuota")}</Label>
            <Input
              id="wfh-quota"
              type="number"
              value={policy.monthlyQuota}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  monthlyQuota: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hybrid-days">{t("admin.hybridOfficeDays")}</Label>
            <Input
              id="hybrid-days"
              type="number"
              value={policy.hybridOfficeDays}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  hybridOfficeDays: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/70 px-3.5 py-3">
          <div>
            <p className="text-sm font-medium">{t("admin.approvalRequired")}</p>
            <p className="text-xs text-muted-foreground">
              {t("admin.wfhApprovalHint")}
            </p>
          </div>
          <Switch
            checked={policy.requiresApproval}
            onCheckedChange={(v) =>
              setPolicy((p) => ({ ...p, requiresApproval: v }))
            }
            disabled={!policy.enabled}
          />
        </div>
        </div>
      </div>
    </motion.section>
  );
}
