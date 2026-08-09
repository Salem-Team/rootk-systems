import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { EmployeeSalaryProfile } from "@/types/payroll";

export function SalaryProfileDetailCard({
  profile,
  loc,
  onEdit,
}: {
  profile: EmployeeSalaryProfile;
  loc: "en" | "ar";
  onEdit?: () => void;
}) {
  const { t } = useTranslation();

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
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
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
          <p className="mb-2 text-sm font-semibold">{t("payroll.allowances")}</p>
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
            <div key={row.label} className="rounded-lg border border-border/60 px-3 py-2">
              <p className="section-label">{row.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
