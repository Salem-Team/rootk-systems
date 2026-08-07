"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { updateSalaryProfile } from "@/services/payroll.service";
import { useTranslation } from "@/hooks/use-translation";
import type { EmployeeSalaryProfile } from "@/types/payroll";

type Draft = {
  basicSalary: number;
  housing: number;
  transportation: number;
  meal: number;
  phone: number;
  other: number;
  shift: number;
  bonuses: number;
  commission: number;
  incentives: number;
  manualAdjustments: number;
  insurance: number;
  tax: number;
  loan: number;
  advances: number;
  recurring: number;
  penalties: number;
  salaryGrade: EmployeeSalaryProfile["salaryGrade"];
  salaryType: EmployeeSalaryProfile["salaryType"];
  payrollGroup: EmployeeSalaryProfile["payrollGroup"];
  currency: string;
  bankAccount: string;
  iban: string;
  paymentMethod: EmployeeSalaryProfile["paymentMethod"];
  insuranceStatus: EmployeeSalaryProfile["insuranceStatus"];
  taxStatus: EmployeeSalaryProfile["taxStatus"];
  contractType: EmployeeSalaryProfile["contractType"];
};

function fromProfile(p: EmployeeSalaryProfile): Draft {
  return {
    basicSalary: p.basicSalary,
    housing: p.allowances.housing,
    transportation: p.allowances.transportation,
    meal: p.allowances.meal,
    phone: p.allowances.phone,
    other: p.allowances.other,
    shift: p.allowances.shift,
    bonuses: p.bonuses,
    commission: p.commission,
    incentives: p.incentives,
    manualAdjustments: p.manualAdjustments,
    insurance: p.deductions.insurance,
    tax: p.deductions.tax,
    loan: p.deductions.loan,
    advances: p.deductions.advances,
    recurring: p.deductions.recurring,
    penalties: p.deductions.penalties,
    salaryGrade: p.salaryGrade,
    salaryType: p.salaryType,
    payrollGroup: p.payrollGroup,
    currency: p.currency,
    bankAccount: p.bankAccount,
    iban: p.iban,
    paymentMethod: p.paymentMethod,
    insuranceStatus: p.insuranceStatus,
    taxStatus: p.taxStatus,
    contractType: p.contractType,
  };
}

export function SalaryProfileEditorSheet({
  open,
  onOpenChange,
  profile,
  employeeLabel,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EmployeeSalaryProfile | null;
  employeeLabel?: string;
  onSaved: (profile: EmployeeSalaryProfile) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && profile) setDraft(fromProfile(profile));
    if (!open) setDraft(null);
  }, [open, profile]);

  function setNum<K extends keyof Draft>(key: K, raw: string) {
    const n = Number(raw);
    setDraft((d) => (d ? { ...d, [key]: Number.isFinite(n) ? n : 0 } : d));
  }

  async function save() {
    if (!profile || !draft) return;
    setBusy(true);
    const res = await updateSalaryProfile(profile.employeeId, {
      basicSalary: draft.basicSalary,
      allowances: {
        housing: draft.housing,
        transportation: draft.transportation,
        meal: draft.meal,
        phone: draft.phone,
        other: draft.other,
        shift: draft.shift,
      },
      bonuses: draft.bonuses,
      commission: draft.commission,
      incentives: draft.incentives,
      manualAdjustments: draft.manualAdjustments,
      deductions: {
        insurance: draft.insurance,
        tax: draft.tax,
        loan: draft.loan,
        advances: draft.advances,
        recurring: draft.recurring,
        penalties: draft.penalties,
      },
      salaryGrade: draft.salaryGrade,
      salaryType: draft.salaryType,
      payrollGroup: draft.payrollGroup,
      currency: draft.currency,
      bankAccount: draft.bankAccount,
      iban: draft.iban,
      paymentMethod: draft.paymentMethod,
      insuranceStatus: draft.insuranceStatus,
      taxStatus: draft.taxStatus,
      contractType: draft.contractType,
      historyNote: t("payroll.adminSalaryUpdateNote"),
    });
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("payroll.salaryProfileSaved"));
    onSaved(res.data);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("payroll.editSalaryProfile")}</SheetTitle>
          <SheetDescription>
            {employeeLabel
              ? t("payroll.editSalaryProfileDescNamed", { name: employeeLabel })
              : t("payroll.editSalaryProfileDesc")}
          </SheetDescription>
        </SheetHeader>

        {draft ? (
          <div className="mt-6 grid gap-5">
            <Section title={t("payroll.basicSalary")}>
              <MoneyField
                id="basic"
                label={t("payroll.basicSalary")}
                value={draft.basicSalary}
                onChange={(v) => setNum("basicSalary", v)}
              />
            </Section>

            <Section title={t("payroll.allowances")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["housing", t("payroll.housing")],
                    ["transportation", t("payroll.transportation")],
                    ["meal", t("payroll.meal")],
                    ["phone", t("payroll.phone")],
                    ["shift", t("payroll.shiftAllowance")],
                    ["other", t("payroll.otherAllowances")],
                  ] as const
                ).map(([key, label]) => (
                  <MoneyField
                    key={key}
                    id={key}
                    label={label}
                    value={draft[key]}
                    onChange={(v) => setNum(key, v)}
                  />
                ))}
              </div>
            </Section>

            <Section title={t("payroll.earningsExtras")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["bonuses", t("payroll.bonuses")],
                    ["commission", t("payroll.commission")],
                    ["incentives", t("payroll.incentives")],
                    ["manualAdjustments", t("payroll.manualAdjustments")],
                  ] as const
                ).map(([key, label]) => (
                  <MoneyField
                    key={key}
                    id={key}
                    label={label}
                    value={draft[key]}
                    onChange={(v) => setNum(key, v)}
                  />
                ))}
              </div>
            </Section>

            <Section title={t("payroll.deductions")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["insurance", t("payroll.insurance")],
                    ["tax", t("payroll.tax")],
                    ["loan", t("payroll.loan")],
                    ["advances", t("payroll.advances")],
                    ["recurring", t("payroll.recurringDeductions")],
                    ["penalties", t("payroll.penalties")],
                  ] as const
                ).map(([key, label]) => (
                  <MoneyField
                    key={key}
                    id={key}
                    label={label}
                    value={draft[key]}
                    onChange={(v) => setNum(key, v)}
                  />
                ))}
              </div>
            </Section>

            <Section title={t("payroll.contractMeta")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label={t("payroll.salaryGrade")}
                  value={draft.salaryGrade}
                  onChange={(v) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            salaryGrade:
                              v as EmployeeSalaryProfile["salaryGrade"],
                          }
                        : d
                    )
                  }
                  options={["G1", "G2", "G3", "G4", "G5", "G6", "G7"]}
                />
                <SelectField
                  label={t("payroll.payrollGroup")}
                  value={draft.payrollGroup}
                  onChange={(v) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            payrollGroup:
                              v as EmployeeSalaryProfile["payrollGroup"],
                          }
                        : d
                    )
                  }
                  options={["standard", "executive", "shift", "contract"]}
                  labelFn={(v) => t(`payroll.group.${v}` as "payroll.group.standard")}
                />
                <SelectField
                  label={t("payroll.paymentMethod")}
                  value={draft.paymentMethod}
                  onChange={(v) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            paymentMethod:
                              v as EmployeeSalaryProfile["paymentMethod"],
                          }
                        : d
                    )
                  }
                  options={["bank_transfer", "cash", "cheque"]}
                  labelFn={(v) =>
                    t(`payroll.payment.${v}` as "payroll.payment.cash")
                  }
                />
                <div className="space-y-2">
                  <Label htmlFor="bank">{t("payroll.bankAccount")}</Label>
                  <Input
                    id="bank"
                    value={draft.bankAccount}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, bankAccount: e.target.value } : d
                      )
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="iban">{t("payroll.iban")}</Label>
                  <Input
                    id="iban"
                    value={draft.iban}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, iban: e.target.value } : d))
                    }
                  />
                </div>
              </div>
            </Section>

            <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="button" disabled={busy} onClick={() => void save()}>
                {busy ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={50}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  labelFn,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labelFn?: (v: string) => string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {labelFn ? labelFn(opt) : opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
