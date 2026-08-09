import { Badge } from "@/components/ui/badge";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { EmployeePayslip } from "@/types/payroll";

export function PayrollLedgerTable({
  payslips,
  employees,
  loc,
}: {
  payslips: EmployeePayslip[];
  employees: Employee[];
  loc: "en" | "ar";
}) {
  const { t } = useTranslation();
  const rows = payslips.map((slip) => {
    const emp = employees.find((e) => e.id === slip.employeeId);
    const attendanceHits = slip.attendanceImpacts?.length ?? 0;
    const leaveHits = slip.leaveImpacts?.length ?? 0;
    return { slip, emp, attendanceHits, leaveHits };
  });

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">
          {t("payroll.ledgerPayslips")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("payroll.ledgerPayslipsDesc")}
        </p>
      </div>
      <div className="panel-body overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border/70 text-start text-xs text-muted-foreground">
              <th className="px-2 py-2 font-medium">{t("payroll.employee")}</th>
              <th className="px-2 py-2 font-medium">{t("payroll.department")}</th>
              <th className="px-2 py-2 font-medium">{t("payroll.gross")}</th>
              <th className="px-2 py-2 font-medium">{t("payroll.deductions")}</th>
              <th className="px-2 py-2 font-medium">{t("payroll.netSalary")}</th>
              <th className="px-2 py-2 font-medium">{t("payroll.attendanceImpacts")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ slip, emp, attendanceHits, leaveHits }) => (
              <tr
                key={slip.id}
                className="border-b border-border/40 last:border-0"
              >
                <td className="px-2 py-2.5">
                  <p className="font-medium">{emp?.name ?? slip.employeeId}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {emp?.employeeId}
                  </p>
                </td>
                <td className="px-2 py-2.5 text-muted-foreground">
                  {emp?.department ?? "—"}
                </td>
                <td className="px-2 py-2.5 tabular-nums">
                  {formatEgp(slip.gross, loc)}
                </td>
                <td className="px-2 py-2.5 tabular-nums text-rose-700 dark:text-rose-300">
                  {formatEgp(slip.deductionsTotal, loc)}
                </td>
                <td className="px-2 py-2.5 font-semibold tabular-nums">
                  {formatEgp(slip.net, loc)}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">
                      {t("payroll.attendanceCount", { count: attendanceHits })}
                    </Badge>
                    <Badge variant="secondary">
                      {t("payroll.leaveCount", { count: leaveHits })}
                    </Badge>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-8 text-center text-muted-foreground"
                >
                  {t("payroll.ledgerEmpty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
