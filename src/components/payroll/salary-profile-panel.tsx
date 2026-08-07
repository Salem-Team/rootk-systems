"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { EmployeePayslip, EmployeeSalaryProfile } from "@/types/payroll";

function sumAllowances(profile: EmployeeSalaryProfile): number {
  const a = profile.allowances;
  return (
    a.housing + a.transportation + a.meal + a.phone + a.shift + a.other
  );
}

function sumDeductions(profile: EmployeeSalaryProfile): number {
  const d = profile.deductions;
  return (
    d.insurance + d.tax + d.loan + d.advances + d.recurring + d.penalties
  );
}

/** Contract preview from saved profile (before attendance/leave run impacts). */
function contractTotals(profile: EmployeeSalaryProfile) {
  const allowancesTotal = sumAllowances(profile);
  const gross =
    profile.basicSalary +
    allowancesTotal +
    profile.bonuses +
    profile.commission +
    profile.incentives +
    profile.manualAdjustments;
  const deductionsTotal = sumDeductions(profile);
  const net = gross - deductionsTotal;
  return { allowancesTotal, gross, deductionsTotal, net };
}

export function SalaryProfilePanel({
  profile,
  payslip,
  onEdit,
}: {
  profile: EmployeeSalaryProfile;
  /** Engine result for the period when a run exists — preferred over contract preview. */
  payslip?: EmployeePayslip | null;
  onEdit?: () => void;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const contract = contractTotals(profile);
  const gross = payslip?.gross ?? contract.gross;
  const deductionsTotal = payslip?.deductionsTotal ?? contract.deductionsTotal;
  const net = payslip?.net ?? contract.net;
  const fromRun = Boolean(payslip);

  const allowanceRows = [
    { label: t("payroll.housing"), value: profile.allowances.housing },
    {
      label: t("payroll.transportation"),
      value: profile.allowances.transportation,
    },
    { label: t("payroll.meal"), value: profile.allowances.meal },
    { label: t("payroll.phone"), value: profile.allowances.phone },
    { label: t("payroll.shiftAllowance"), value: profile.allowances.shift },
    { label: t("payroll.otherAllowances"), value: profile.allowances.other },
  ];

  const deductionRows = [
    { label: t("payroll.insurance"), value: profile.deductions.insurance },
    { label: t("payroll.tax"), value: profile.deductions.tax },
    { label: t("payroll.loan"), value: profile.deductions.loan },
    { label: t("payroll.advances"), value: profile.deductions.advances },
    {
      label: t("payroll.recurringDeductions"),
      value: profile.deductions.recurring,
    },
    { label: t("payroll.penalties"), value: profile.deductions.penalties },
  ];

  const meta = [
    {
      label: t("payroll.payrollGroup"),
      value: t(`payroll.group.${profile.payrollGroup}`),
    },
    {
      label: t("payroll.paymentMethod"),
      value: t(`payroll.payment.${profile.paymentMethod}`),
    },
    {
      label: t("payroll.insuranceStatus"),
      value: t(`payroll.insuranceStatusValue.${profile.insuranceStatus}`),
    },
    {
      label: t("payroll.taxStatus"),
      value: t(`payroll.taxStatusValue.${profile.taxStatus}`),
    },
    {
      label: t("payroll.contractType"),
      value: t(`payroll.contract.${profile.contractType}`),
    },
    { label: t("payroll.joiningDate"), value: profile.joiningDate },
    { label: t("payroll.bankAccount"), value: profile.bankAccount },
    { label: t("payroll.iban"), value: profile.iban },
  ];

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden">
        <div className="panel-header flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-[0.95rem] font-semibold">
              {t("payroll.finalSalaryTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {fromRun
                ? t("payroll.finalSalaryFromRun")
                : t("payroll.finalSalaryFromContract")}
            </p>
          </div>
          {fromRun ? (
            <Badge variant="info">{t("payroll.periodCalculated")}</Badge>
          ) : (
            <Badge variant="outline">{t("payroll.contractPreview")}</Badge>
          )}
        </div>
        <div className="panel-body grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="section-label">{t("payroll.gross")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatEgp(gross, loc)}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="section-label">{t("payroll.totalDeductions")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-rose-700 dark:text-rose-300">
              −{formatEgp(deductionsTotal, loc)}
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
            <p className="section-label text-primary/80">
              {t("payroll.finalNetSalary")}
            </p>
            <p className="stat-value mt-1 text-primary">{formatEgp(net, loc)}</p>
          </div>
        </div>
        {payslip ? (
          <div className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            {t("payroll.employerCost")}:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatEgp(payslip.employerCost, loc)}
            </span>
            {payslip.attendanceDeductions > 0 || payslip.leaveDeductions > 0
              ? ` · ${t("payroll.includesAttendanceImpacts")}`
              : null}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel overflow-hidden">
          <div className="panel-header flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[0.95rem] font-semibold">
                {t("payroll.salaryProfile")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("payroll.salaryProfileDesc")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="info">{profile.salaryGrade}</Badge>
              <Badge variant="outline">
                {t(`payroll.salaryType.${profile.salaryType}`)}
              </Badge>
              <Badge variant="secondary">{profile.currency}</Badge>
              {onEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onEdit}
                >
                  {t("payroll.editSalaryProfile")}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="panel-body space-y-4">
            <div>
              <p className="section-label">{t("payroll.basicSalary")}</p>
              <p className="stat-value mt-1 text-[1.5rem]">
                {formatEgp(profile.basicSalary, loc)}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">
                {t("payroll.allowances")}
              </p>
              <ul className="space-y-1.5">
                {allowanceRows.map((row) => (
                  <li
                    key={row.label}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span>{row.label}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatEgp(row.value, loc)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="section-label">{t("payroll.bonuses")}</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatEgp(profile.bonuses, loc)}
                </p>
              </div>
              <div>
                <p className="section-label">{t("payroll.commission")}</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatEgp(profile.commission, loc)}
                </p>
              </div>
              <div>
                <p className="section-label">{t("payroll.incentives")}</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatEgp(profile.incentives, loc)}
                </p>
              </div>
              <div>
                <p className="section-label">{t("payroll.manualAdjustments")}</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatEgp(profile.manualAdjustments, loc)}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {meta.map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-border/60 px-3 py-2"
                >
                  <p className="section-label">{row.label}</p>
                  <p className="mt-0.5 truncate text-sm font-medium">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold">
              {t("payroll.deductions")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("payroll.netPreview")}
            </p>
          </div>
          <div className="panel-body space-y-4">
            <ul className="space-y-1.5">
              {deductionRows.map((row) => (
                <li
                  key={row.label}
                  className="flex justify-between text-sm text-muted-foreground"
                >
                  <span>{row.label}</span>
                  <span className="font-medium tabular-nums text-rose-700 dark:text-rose-300">
                    −{formatEgp(row.value, loc)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5 text-sm">
              <span className="font-medium">{t("payroll.totalDeductions")}</span>
              <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                −
                {formatEgp(
                  fromRun ? deductionsTotal : contract.deductionsTotal,
                  loc
                )}
              </span>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">
                {t("payroll.salaryHistory")}
              </p>
              <ul className="space-y-2">
                {profile.history.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium tabular-nums">
                        {formatEgp(h.basicSalary, loc)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {h.effectiveFrom}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {h.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">
                {t("payroll.incrementHistory")}
              </p>
              <ul className="space-y-2">
                {profile.incrementHistory.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium tabular-nums">
                        {formatEgp(h.previousBasic, loc)} →{" "}
                        {formatEgp(h.newBasic, loc)}
                      </span>
                      <Badge variant="outline">+{h.percent}%</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {h.effectiveFrom} · {h.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
