import { Badge } from "@/components/ui/badge";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { EmployeePayslip } from "@/types/payroll";

export function SalaryProfileSummaryCard({
  gross,
  deductionsTotal,
  net,
  payslip,
  loc,
}: {
  gross: number;
  deductionsTotal: number;
  net: number;
  payslip?: EmployeePayslip | null;
  loc: "en" | "ar";
}) {
  const { t } = useTranslation();
  const fromRun = Boolean(payslip);

  return (
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
  );
}
