"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updatePayrollPolicies } from "@/services/payroll.service";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollPolicies } from "@/types/payroll";
import { LateTiersEditor } from "./payroll-late-tiers-editor";
import { parseNum, PolicyNumberField } from "./payroll-policy-fields";

export function PayrollPoliciesPanel({
  policies,
  editable,
  onChange,
}: {
  policies: PayrollPolicies;
  editable: boolean;
  onChange: (next: PayrollPolicies) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(policies);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(policies);
  }, [policies]);

  async function save() {
    if (!editable) return;
    setSaving(true);
    const sanitized: PayrollPolicies = {
      ...draft,
      absenceDayFraction: Math.min(1, Math.max(0, draft.absenceDayFraction || 0)),
      halfDayFraction: Math.min(1, Math.max(0, draft.halfDayFraction || 0)),
      earlyLeaveDayFraction: Math.min(
        1,
        Math.max(0, draft.earlyLeaveDayFraction || 0)
      ),
      missingPunchDayFraction: Math.min(
        1,
        Math.max(0, draft.missingPunchDayFraction || 0)
      ),
      maxDeductionDayFraction: Math.min(
        1,
        Math.max(0, draft.maxDeductionDayFraction || 0)
      ),
      late: {
        ...draft.late,
        graceMinutes: Math.max(0, Math.round(draft.late.graceMinutes || 0)),
        tiers: draft.late.tiers
          .map((tier) => ({
            afterMinutes: Math.max(0, Math.round(tier.afterMinutes || 0)),
            dayFraction: Math.min(1, Math.max(0, tier.dayFraction || 0)),
          }))
          .sort((a, b) => a.afterMinutes - b.afterMinutes),
      },
    };
    const res = await updatePayrollPolicies(sanitized);
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onChange(res.data);
    toast.success(t("payroll.policiesSaved"));
  }

  function num(key: keyof PayrollPolicies, label: string, step = 0.25, min = 0) {
    const value = draft[key];
    if (typeof value !== "number") return null;
    return (
      <PolicyNumberField
        id={String(key)}
        label={label}
        step={step}
        min={min}
        disabled={!editable}
        value={value}
        onChange={(next) => setDraft((d) => ({ ...d, [key]: next }))}
      />
    );
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.policiesTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("payroll.policiesDesc")}
          </p>
        </div>
        {editable ? (
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        ) : null}
      </div>
      <div className="panel-body grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {num("absenceDayFraction", t("payroll.policyAbsence"))}
        {num("halfDayFraction", t("payroll.policyHalfDay"))}
        {num("earlyLeaveDayFraction", t("payroll.policyEarlyLeave"))}
        {num("missingPunchDayFraction", t("payroll.policyMissingPunch"))}
        {num("overtimeRate", t("payroll.policyOt"), 0.1)}
        {num("weekendOvertimeRate", t("payroll.policyWeekendOt"), 0.1)}
        {num("holidayOvertimeRate", t("payroll.policyHolidayOt"), 0.1)}
        {num("nightShiftAllowance", t("payroll.policyNightShift"), 50)}
        {num("maxDeductionDayFraction", t("payroll.policyMaxDeduction"))}
        {num("monthlyDeductionCap", t("payroll.policyMonthlyCap"), 100)}
        {num("paymentDay", t("payroll.policyPaymentDay"), 1)}
        <div className="space-y-1.5">
          <Label htmlFor="grace">{t("payroll.policyGrace")}</Label>
          <Input
            id="grace"
            type="number"
            min={0}
            disabled={!editable}
            value={draft.late.graceMinutes}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                late: {
                  ...d.late,
                  graceMinutes: parseNum(e.target.value, 0),
                },
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            {t("payroll.policyGraceHint")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency">{t("payroll.policyCurrency")}</Label>
          <Input
            id="currency"
            disabled={!editable}
            value={draft.currency}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                currency: e.target.value.toUpperCase(),
              }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cycle">{t("payroll.policyCycle")}</Label>
          <select
            id="cycle"
            disabled={!editable}
            className="h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
            value={draft.payrollCycle}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                payrollCycle: e.target.value as PayrollPolicies["payrollCycle"],
              }))
            }
          >
            <option value="monthly">{t("payroll.cycle.monthly")}</option>
            <option value="biweekly">{t("payroll.cycle.biweekly")}</option>
            <option value="weekly">{t("payroll.cycle.weekly")}</option>
          </select>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-sm font-medium">{t("payroll.policyRounding")}</p>
            <p className="text-xs text-muted-foreground">
              {draft.autoRounding}
            </p>
          </div>
          <Switch
            checked={draft.autoRounding !== "none"}
            disabled={!editable}
            onCheckedChange={(on) =>
              setDraft((d) => ({
                ...d,
                autoRounding: on ? "nearest_1" : "none",
              }))
            }
            aria-label={t("payroll.policyRounding")}
          />
        </div>

        <LateTiersEditor
          tiers={draft.late.tiers}
          editable={editable}
          onChange={(tiers) =>
            setDraft((d) => ({ ...d, late: { ...d.late, tiers } }))
          }
        />

        <div className="sm:col-span-2 lg:col-span-3">
          <p className="mb-2 text-sm font-semibold">
            {t("payroll.deductionPriority")}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("payroll.deductionPriorityDesc")}
          </p>
          <ol className="flex flex-wrap gap-2">
            {draft.deductionPriority.map((item, idx) => (
              <li
                key={item}
                className="rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium"
              >
                {idx + 1}. {t(`payroll.priority.${item}`)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
