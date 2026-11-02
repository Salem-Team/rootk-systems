"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { SafeResponsiveChart } from "@/components/shared/safe-responsive-chart";
import { ChartRtlTick } from "@/components/shared/chart-rtl";
import { StaggerItem, StaggerRoot } from "@/components/shared/stagger";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollReportBundle } from "@/types/payroll";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(var(--destructive))",
];

export function PayrollReportsPanel({
  reports,
}: {
  reports: PayrollReportBundle;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";

  const departmentChart = (reports.departmentRows ?? []).map((row) => ({
    name: row.department,
    net: row.net,
    gross: row.gross,
    deductions: row.deductions,
    overtime: row.overtime,
  }));

  const deductionChart = (reports.deductionAnalysis ?? [])
    .map((d) => ({
      name: "label" in d && d.label ? String(d.label) : String((d as { kind?: string }).kind ?? ""),
      amount: Number(d.amount ?? 0),
    }))
    .filter((d) => d.amount > 0 && d.name);

  const monthlyChart = (reports.monthlyComparison ?? []).map((m) => ({
    ...m,
    monthLabel: m.month,
  }));

  const yearlyChart = (reports.yearlyComparison ?? []).map((y) => ({
    year: String(y.year),
    net: y.net,
  }));

  const hasAnyChart =
    departmentChart.length > 0 ||
    deductionChart.length > 0 ||
    monthlyChart.some((m) => m.net > 0 || m.overtime > 0) ||
    yearlyChart.length > 0;

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
            value: (reports.deductionAnalysis ?? []).reduce(
              (s, d) => s + Number(d.amount ?? 0),
              0
            ),
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

      {!hasAnyChart ? (
        <div className="rounded-xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
          {t("payroll.reportsEmpty")}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="surface-panel p-4">
          <h3 className="mb-3 text-[0.95rem] font-semibold">
            {t("payroll.departmentPayroll")}
          </h3>
          {departmentChart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </p>
          ) : (
            <SafeResponsiveChart height={260}>
              <BarChart data={departmentChart} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={<ChartRtlTick fontSize={11} />}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} width={56} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) =>
                    formatEgp(Number(value ?? 0), loc)
                  }
                />
                <Legend />
                <Bar
                  dataKey="net"
                  name={t("payroll.netSalary")}
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="deductions"
                  name={t("payroll.deductions")}
                  fill="hsl(var(--destructive))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </SafeResponsiveChart>
          )}
        </section>

        <section className="surface-panel p-4">
          <h3 className="mb-3 text-[0.95rem] font-semibold">
            {t("payroll.reportDeductions")}
          </h3>
          {deductionChart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </p>
          ) : (
            <SafeResponsiveChart height={260}>
              <PieChart>
                <Pie
                  data={deductionChart}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {deductionChart.map((_, i) => (
                    <Cell
                      key={deductionChart[i].name}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) =>
                    formatEgp(Number(value ?? 0), loc)
                  }
                />
                <Legend />
              </PieChart>
            </SafeResponsiveChart>
          )}
        </section>
      </div>

      <section className="surface-panel p-4">
        <h3 className="mb-3 text-[0.95rem] font-semibold">
          {t("payroll.monthlyComparison")}
        </h3>
        <SafeResponsiveChart height={280}>
          <BarChart data={monthlyChart} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} width={56} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => formatEgp(Number(value ?? 0), loc)}
            />
            <Legend />
            <Bar
              dataKey="net"
              name={t("payroll.netPayroll")}
              fill="var(--primary)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="overtime"
              name={t("payroll.overtime")}
              fill="var(--chart-1)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </SafeResponsiveChart>
      </section>

      {yearlyChart.length > 0 ? (
        <section className="surface-panel p-4">
          <h3 className="mb-3 text-[0.95rem] font-semibold">
            {t("payroll.yearlyComparison")}
          </h3>
          <SafeResponsiveChart height={240}>
            <BarChart data={yearlyChart} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value) => formatEgp(Number(value ?? 0), loc)}
              />
              <Bar
                dataKey="net"
                name={t("payroll.netPayroll")}
                fill="var(--chart-2)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </SafeResponsiveChart>
        </section>
      ) : null}

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.departmentPayroll")}
          </h3>
        </div>
        <div className="table-scroll">
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
              {(reports.departmentRows ?? []).map((row) => (
                <tr
                  key={row.department}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium">{row.department}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {row.headcount ?? 0}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.gross, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.deductions ?? 0, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.overtime ?? 0, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold">
                    {formatEgp(row.net, loc)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatEgp(row.employerCost ?? 0, loc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
