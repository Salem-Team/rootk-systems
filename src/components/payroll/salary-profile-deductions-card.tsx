import { Badge } from "@/components/ui/badge";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { EmployeeSalaryProfile } from "@/types/payroll";

export function SalaryProfileDeductionsCard({
  profile,
  deductionsTotal,
  loc,
}: {
  profile: EmployeeSalaryProfile;
  deductionsTotal: number;
  loc: "en" | "ar";
}) {
  const { t } = useTranslation();

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

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">{t("payroll.deductions")}</h3>
        <p className="text-sm text-muted-foreground">{t("payroll.netPreview")}</p>
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
            −{formatEgp(deductionsTotal, loc)}
          </span>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("payroll.salaryHistory")}</p>
          <ul className="space-y-2">
            {profile.history.map((h) => (
              <li key={h.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium tabular-nums">
                    {formatEgp(h.basicSalary, loc)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.effectiveFrom}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{h.note}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("payroll.incrementHistory")}</p>
          <ul className="space-y-2">
            {profile.incrementHistory.map((h) => (
              <li key={h.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium tabular-nums">
                    {formatEgp(h.previousBasic, loc)} → {formatEgp(h.newBasic, loc)}
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
  );
}
