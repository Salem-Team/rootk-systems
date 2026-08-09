import { Badge } from "@/components/ui/badge";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { EmployeePayslip } from "@/types/payroll";

export function PayslipStatementFooter({
  payslip,
  loc,
}: {
  payslip: EmployeePayslip;
  loc: "en" | "ar";
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-3 border-t border-border/60 bg-primary/[0.04] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("payroll.netSalary")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-primary sm:text-3xl">
            {formatEgp(payslip.net, loc, payslip.currency)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("payroll.statementNetHint")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:text-end">
          <div>
            <p className="text-[10px] text-muted-foreground">
              {t("payroll.employeeCost")}
            </p>
            <p className="font-semibold tabular-nums">
              {formatEgp(payslip.employeeCost, loc, payslip.currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">
              {t("payroll.employerCost")}
            </p>
            <p className="font-semibold tabular-nums">
              {formatEgp(payslip.employerCost, loc, payslip.currency)}
            </p>
          </div>
        </div>
      </div>

      {payslip.attendanceImpacts.length > 0 || payslip.leaveImpacts.length > 0 ? (
        <div className="border-t border-border/50 px-4 py-3 sm:px-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("payroll.statementImpacts")}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {payslip.attendanceDeductions > 0 ? (
              <Badge variant="warning" className="font-normal">
                {t("payroll.attendanceImpact")}:{" "}
                {formatEgp(payslip.attendanceDeductions, loc, payslip.currency)}
              </Badge>
            ) : null}
            {payslip.leaveDeductions > 0 ? (
              <Badge variant="outline" className="font-normal">
                {t("payroll.leaveImpact")}:{" "}
                {formatEgp(payslip.leaveDeductions, loc, payslip.currency)}
              </Badge>
            ) : null}
            {payslip.overtimePay > 0 ? (
              <Badge variant="secondary" className="font-normal">
                {t("payroll.overtime")}:{" "}
                {formatEgp(payslip.overtimePay, loc, payslip.currency)}
              </Badge>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
