"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updatePayrollPolicies } from "@/services/payroll.service";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollPolicies } from "@/types/payroll";

function parseNum(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

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

  function num(
    key: keyof PayrollPolicies,
    label: string,
    step = 0.25,
    min = 0
  ) {
    const value = draft[key];
    if (typeof value !== "number") return null;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={String(key)}>{label}</Label>
        <Input
          id={String(key)}
          type="number"
          step={step}
          min={min}
          disabled={!editable}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              [key]: parseNum(e.target.value, 0),
            }))
          }
        />
      </div>
    );
  }

  function updateTier(
    index: number,
    patch: Partial<{ afterMinutes: number; dayFraction: number }>
  ) {
    setDraft((d) => ({
      ...d,
      late: {
        ...d.late,
        tiers: d.late.tiers.map((tier, i) =>
          i === index ? { ...tier, ...patch } : tier
        ),
      },
    }));
  }

  function addTier() {
    setDraft((d) => {
      const last = d.late.tiers[d.late.tiers.length - 1];
      return {
        ...d,
        late: {
          ...d.late,
          tiers: [
            ...d.late.tiers,
            {
              afterMinutes: (last?.afterMinutes ?? 0) + 15,
              dayFraction: Math.min(1, (last?.dayFraction ?? 0.25) + 0.25),
            },
          ],
        },
      };
    });
  }

  function removeTier(index: number) {
    setDraft((d) => ({
      ...d,
      late: {
        ...d.late,
        tiers: d.late.tiers.filter((_, i) => i !== index),
      },
    }));
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

        <div className="space-y-3 rounded-xl border border-border/70 p-3 sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t("payroll.lateTiersTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("payroll.lateTiersDesc")}
              </p>
            </div>
            {editable ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addTier}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t("payroll.lateTierAdd")}
              </Button>
            ) : null}
          </div>
          {draft.late.tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("payroll.lateTiersEmpty")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draft.late.tiers.map((tier, index) => (
                <div
                  key={`tier-${index}`}
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border border-border/50 p-2.5"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`late-after-${index}`}>
                      {t("payroll.lateTierAfter")}
                    </Label>
                    <Input
                      id={`late-after-${index}`}
                      type="number"
                      min={0}
                      disabled={!editable}
                      value={tier.afterMinutes}
                      onChange={(e) =>
                        updateTier(index, {
                          afterMinutes: parseNum(e.target.value, 0),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`late-frac-${index}`}>
                      {t("payroll.lateTierFraction")}
                    </Label>
                    <Input
                      id={`late-frac-${index}`}
                      type="number"
                      step={0.25}
                      min={0}
                      max={1}
                      disabled={!editable}
                      value={tier.dayFraction}
                      onChange={(e) =>
                        updateTier(index, {
                          dayFraction: parseNum(e.target.value, 0),
                        })
                      }
                    />
                  </div>
                  {editable ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      disabled={draft.late.tiers.length <= 1}
                      onClick={() => removeTier(index)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

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
