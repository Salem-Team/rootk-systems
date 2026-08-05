"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { StaggerItem, StaggerRoot } from "@/components/shared/stagger";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollReportBundle } from "@/types/payroll";

export function PayrollReportsPanel({
  reports,
}: {
  reports: PayrollReportBundle;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";

  return (
    <div className="space-y-4">
      <StaggerRoot
        speed="fast"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {[
          {
            label: t("payroll.reportSalaryCost"),
            value: reports.salaryCost,
          },
          {
            label: t("payroll.reportOvertimeCost"),
            value: reports.overtimeCost,
          },
          {
            label: t("payroll.reportAttendanceCost"),
            value: reports.attendanceCost,
          },
          { label: t("payroll.reportLeaveCost"), value: reports.leaveCost },
          {
            label: t("payroll.reportDeductions"),
            value: reports.deductionAnalysis.reduce((s, d) => s + d.amount, 0),
          },
        ].map((card) => (
          <StaggerItem key={card.label}>
            <article className="kpi-tile surface-panel-interactive surface-shine p-4">
              <p className="section-label">{card.label}</p>
              <p className="stat-value mt-2 text-[1.25rem]">
                {formatEgp(card.value, loc)}
              </p>
            </article>
          </StaggerItem>
        ))}
      </StaggerRoot>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.departmentPayroll")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border/70 bg-muted/30 text-start text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("common.department")}</th>
                <th className="px-4 py-2.5 font-medium">{t("payroll.headcount")}</th>
                <th className="px-4 py-2.5 font-medium">{t("payroll.gross")}</th>
                <th className="px-4 py-2.5 font-medium">{t("payroll.deductions")}</th>
                <th className="px-4 py-2.5 font-medium">{t("payroll.overtime")}</th>
                <th className="px-4 py-2.5 font-medium">{t("payroll.netSalary")}</th>
                <th className="px-4 py-2.5 font-medium">{t("payroll.employerCost")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.departmentRows.map((row) => (
                <tr
                  key={row.department}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium">{row.department}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.headcount}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.gross, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.deductions, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.overtime, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold">
                    {formatEgp(row.net, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.employerCost, loc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-panel p-4">
        <h3 className="mb-3 text-[0.95rem] font-semibold">
          {t("payroll.monthlyComparison")}
        </h3>
        <div className="h-64 w-full" role="img" aria-label={t("payroll.monthlyComparison")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reports.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="net" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              <Bar
                dataKey="overtime"
                fill="var(--chart-1)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
