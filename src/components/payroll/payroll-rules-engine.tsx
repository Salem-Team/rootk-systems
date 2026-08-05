"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { togglePayrollRule } from "@/services/payroll.service";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { PayrollRule } from "@/types/payroll";

const POLICY_MANAGED_FIELDS = new Set([
  "late_minutes",
  "late_over_grace",
  "absent",
  "half_day",
  "early_leave",
]);

export function PayrollRulesEngine({
  rules,
  editable,
  onChange,
}: {
  rules: PayrollRule[];
  editable: boolean;
  onChange: (next: PayrollRule[]) => void;
}) {
  const { t } = useTranslation();

  async function onToggle(id: string, enabled: boolean) {
    if (!editable) return;
    const res = await togglePayrollRule(id, enabled);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onChange(res.data);
    toast.success(
      enabled ? t("payroll.ruleEnabled") : t("payroll.ruleDisabled")
    );
  }

  return (
    <section
      className="surface-panel overflow-hidden"
      aria-labelledby="rules-engine-heading"
    >
      <div className="panel-header">
        <h3 id="rules-engine-heading" className="text-[0.95rem] font-semibold">
          {t("payroll.rulesTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("payroll.rulesDesc")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("payroll.rulesOverrideHint")}
        </p>
      </div>
      <ul className="divide-y divide-border/60">
        {rules
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((rule) => {
            const managedByPolicies = POLICY_MANAGED_FIELDS.has(
              rule.when.field
            );
            return (
              <li
                key={rule.id}
                className={cn(
                  "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
                  !rule.enabled && "opacity-60"
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold tracking-tight">{rule.name}</p>
                    <Badge variant="outline">P{rule.priority}</Badge>
                    {managedByPolicies ? (
                      <Badge variant="secondary">
                        {t("payroll.rulesCanOverride")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {managedByPolicies
                      ? rule.enabled
                        ? t("payroll.rulesOverrideActive")
                        : t("payroll.rulesManagedByPolicies")
                      : rule.description}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground/80">
                    {rule.when.field} {rule.when.operator} {rule.when.value}
                    {" → "}
                    {rule.then.action} {rule.then.amount}
                  </p>
                </div>
                <Switch
                  checked={rule.enabled}
                  disabled={!editable}
                  onCheckedChange={(on) => void onToggle(rule.id, on)}
                  aria-label={rule.name}
                />
              </li>
            );
          })}
      </ul>
    </section>
  );
}
