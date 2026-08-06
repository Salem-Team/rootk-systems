"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DeductionChargeEditor } from "@/components/admin/deduction-charge-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_DEDUCTION_POLICY,
  deductionPolicyToPayrollPatch,
  payrollToDeductionPolicy,
  sanitizeDeductionPolicy,
} from "@/lib/work-deduction-policy";
import { useTranslation } from "@/hooks/use-translation";
import {
  getWorkSchedule,
  updateWorkSchedule,
} from "@/services/schedule.service";
import {
  getPayrollPolicies,
  updatePayrollPolicies,
} from "@/services/payroll.service";
import type {
  DeductionCharge,
  ScheduleAdminMetadata,
  WorkDeductionPolicy,
} from "@/types/org";

type RuleKey = "absence" | "halfDay" | "earlyLeave" | "missingPunch";

export function WorkDeductionRulesPanel() {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<WorkDeductionPolicy>(
    DEFAULT_DEDUCTION_POLICY
  );
  const [currency, setCurrency] = useState("EGP");
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [schedRes, payRes] = await Promise.all([
        getWorkSchedule(),
        getPayrollPolicies(),
      ]);
      if (!mounted) return;
      const meta = (schedRes.data?.metadata ?? {}) as ScheduleAdminMetadata;
      if (meta.deductionPolicy) {
        setPolicy(sanitizeDeductionPolicy(meta.deductionPolicy));
      } else if (payRes.success) {
        setPolicy(payrollToDeductionPolicy(payRes.data));
      }
      if (payRes.success) setCurrency(payRes.data.currency || "EGP");
      if (schedRes.success) {
        setGraceMinutes(schedRes.data.gracePeriodMinutes);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function setRule(key: RuleKey, charge: DeductionCharge) {
    setPolicy((prev) => ({ ...prev, [key]: charge }));
  }

  async function save() {
    setSaving(true);
    const clean = sanitizeDeductionPolicy(policy);
    const current = await getWorkSchedule();
    const prevMeta = (current.data?.metadata ?? {}) as ScheduleAdminMetadata;
    const schedRes = await updateWorkSchedule({
      metadata: { ...prevMeta, deductionPolicy: clean },
    });
    if (!schedRes.success) {
      setSaving(false);
      toast.error(schedRes.message ?? t("common.error"));
      return;
    }
    const grace = current.data?.gracePeriodMinutes ?? graceMinutes;
    const payRes = await updatePayrollPolicies(
      deductionPolicyToPayrollPatch(clean, grace)
    );
    setSaving(false);
    if (!payRes.success) {
      toast.error(payRes.message ?? t("common.error"));
      return;
    }
    setPolicy(clean);
    toast.success(t("admin.deductionRulesSaved"));
  }

  const rules: { key: RuleKey; label: string }[] = [
    { key: "absence", label: t("admin.deductionAbsence") },
    { key: "halfDay", label: t("admin.deductionHalfDayRule") },
    { key: "earlyLeave", label: t("admin.deductionEarlyLeave") },
    { key: "missingPunch", label: t("admin.deductionMissingPunch") },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Wallet className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.deductionRules")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.deductionRulesDesc")}
          </p>
        </div>
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {t("common.save")}
        </Button>
      </div>
      <div className="panel-body space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {rules.map((rule) => (
            <div
              key={rule.key}
              className="rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3"
            >
              <Label className="text-xs text-muted-foreground">
                {rule.label}
              </Label>
              <div className="mt-2">
                <DeductionChargeEditor
                  charge={policy[rule.key]}
                  currency={currency}
                  onChange={(c) => setRule(rule.key, c)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="section-label">{t("admin.deductionLateTiers")}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setPolicy((prev) => ({
                  ...prev,
                  lateTiers: [
                    ...prev.lateTiers,
                    {
                      afterMinutes:
                        (prev.lateTiers.at(-1)?.afterMinutes ?? 0) + 30,
                      charge: { mode: "day_fraction", value: 0.5 },
                    },
                  ],
                }))
              }
            >
              <Plus className="h-3.5 w-3.5" />
              {t("admin.deductionAddTier")}
            </Button>
          </div>
          <div className="space-y-3">
            {policy.lateTiers.map((tier, idx) => (
              <div
                key={`${tier.afterMinutes}-${idx}`}
                className="rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3"
              >
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">
                      {t("admin.deductionAfterMinutes")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 w-24 font-mono tabular-nums"
                      value={tier.afterMinutes}
                      onChange={(e) => {
                        const afterMinutes = Number(e.target.value) || 0;
                        setPolicy((prev) => {
                          const lateTiers = [...prev.lateTiers];
                          lateTiers[idx] = { ...tier, afterMinutes };
                          return { ...prev, lateTiers };
                        });
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    disabled={policy.lateTiers.length <= 1}
                    onClick={() =>
                      setPolicy((prev) => ({
                        ...prev,
                        lateTiers: prev.lateTiers.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <DeductionChargeEditor
                  charge={tier.charge}
                  currency={currency}
                  onChange={(charge) =>
                    setPolicy((prev) => {
                      const lateTiers = [...prev.lateTiers];
                      lateTiers[idx] = { ...tier, charge };
                      return { ...prev, lateTiers };
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
