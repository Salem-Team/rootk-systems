"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  Calculator,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  advancePayrollStatus,
  listPayrollRuns,
} from "@/services/payroll.service";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  PayrollDashboardSummary,
  PayrollRun,
} from "@/types/payroll";

export function PayrollLedgerPanel({
  summary,
  payslips,
  employees,
  canAdvance,
  onRunUpdated,
  onRefreshPayslips,
}: {
  summary: PayrollDashboardSummary;
  payslips: EmployeePayslip[];
  employees: Employee[];
  canAdvance: boolean;
  onRunUpdated: (run: PayrollRun) => void;
  onRefreshPayslips: () => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const loc = locale === "ar" ? "ar" : "en";
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    void listPayrollRuns().then((res) => {
      if (!mounted) return;
      if (res.success) setRuns(res.data);
    });
    return () => {
      mounted = false;
    };
  }, [summary.run.status, summary.run.updatedAt]);

  const rows = useMemo(() => {
    return payslips.map((slip) => {
      const emp = employees.find((e) => e.id === slip.employeeId);
      const attendanceHits = slip.attendanceImpacts?.length ?? 0;
      const leaveHits = slip.leaveImpacts?.length ?? 0;
      return { slip, emp, attendanceHits, leaveHits };
    });
  }, [payslips, employees]);

  async function advance() {
    setBusy(true);
    const res = await advancePayrollStatus();
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onRunUpdated(res.data);
    onRefreshPayslips();
    setRuns((prev) => {
      const others = prev.filter((r) => r.periodId !== res.data.periodId);
      return [res.data, ...others];
    });
    toast.success(t("payroll.workflowAdvanced"));
  }

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden">
        <div className="panel-header flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[0.95rem] font-semibold">
              {t("payroll.ledgerTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("payroll.ledgerDesc", { period: summary.period.label })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{summary.period.label}</Badge>
            <Badge variant="info">
              {t(`payroll.status.${summary.run.status}`)}
            </Badge>
            {canAdvance && summary.run.status !== "paid" ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void advance()}
              >
                {busy ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Calculator className="h-3.5 w-3.5" />
                )}
                {t("payroll.advanceStep")}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="panel-body grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={<Users className="h-4 w-4" />}
            label={t("payroll.employeesIncluded")}
            value={String(summary.run.employeeCount ?? summary.employeesIncluded)}
          />
          <Kpi
            icon={<Wallet className="h-4 w-4" />}
            label={t("payroll.netPayroll")}
            value={formatEgp(summary.run.netPayroll ?? summary.netPayroll, loc)}
          />
          <Kpi
            icon={<Clock3 className="h-4 w-4" />}
            label={t("payroll.totalDeductions")}
            value={formatEgp(
              summary.run.totalDeductions ?? summary.totalDeductions,
              loc
            )}
          />
          <Kpi
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={t("payroll.attendanceLinked")}
            value={t("payroll.attendanceLinkedValue")}
          />
        </div>
      </section>

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

      {runs.length > 0 ? (
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold">
              {t("payroll.runsHistory")}
            </h3>
          </div>
          <ul className="panel-body space-y-2">
            {runs.slice(0, 8).map((run) => (
              <li
                key={`${run.id}-${run.version}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{run.periodId}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(parseISO(run.updatedAt), "d MMM yyyy · h:mm a", {
                      locale: dateLocale,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {t(`payroll.status.${run.status}`)}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatEgp(run.netPayroll, loc)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 px-3 py-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
