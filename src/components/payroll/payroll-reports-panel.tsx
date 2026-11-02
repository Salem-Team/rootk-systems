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
import { useIsMobile } from "@/hooks/use-viewport";
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

function shortMonth(periodId: string) {
  const [, m] = periodId.split("-");
  return m ?? periodId;
}

function compactMoney(n: number, loc: "ar" | "en") {
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1000) {
    return `${Math.round(n / 1000)}k`;
  }
  return formatEgp(n, loc);
}

export function PayrollReportsPanel({
  reports,
}: {
  reports: PayrollReportBundle;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const isMobile = useIsMobile();

  const departmentChart = (reports.departmentRows ?? []).map((row) => ({
    name: row.department,
    shortName:
      row.department.length > 10
        ? `${row.department.slice(0, 9)}…`
        : row.department,
    net: row.net,
    gross: row.gross,
    deductions: row.deductions,
    overtime: row.overtime,
  }));

  const deductionChart = (reports.deductionAnalysis ?? [])
    .map((d) => ({
      name:
        "label" in d && d.label
          ? String(d.label)
          : String((d as { kind?: string }).kind ?? ""),
      amount: Number(d.amount ?? 0),
    }))
    .filter((d) => d.amount > 0 && d.name);

  const monthlyChart = (reports.monthlyComparison ?? []).map((m) => ({
    ...m,
    month: isMobile ? shortMonth(m.month) : m.month,
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

  const barMargin = isMobile
    ? { top: 4, right: 4, left: 0, bottom: 4 }
    : { top: 8, right: 8, left: 4, bottom: 8 };
  const yAxisWidth = isMobile ? 36 : 56;
  const legendProps = isMobile
    ? { wrapperStyle: { fontSize: 11, paddingTop: 4 } }
    : undefined;

  return (
    <div className="space-y-3 sm:space-y-4">
      <StaggerRoot
        speed="fast"
        className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5"
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
          <StaggerItem key={card.label} className="min-w-0 last:col-span-2 lg:last:col-span-1">
            <article className="kpi-tile surface-panel-interactive surface-shine h-full p-3 sm:p-4">
              <p className="section-label truncate text-[10px] sm:text-xs">
                {card.label}
              </p>
              <p className="stat-value mt-1.5 text-[1.05rem] sm:mt-2 sm:text-[1.25rem]">
                {isMobile
                  ? compactMoney(card.value, loc)
                  : formatEgp(card.value, loc)}
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

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        <section className="surface-panel overflow-hidden p-3 sm:p-4">
          <h3 className="mb-2 text-[0.9rem] font-semibold sm:mb-3 sm:text-[0.95rem]">
            {t("payroll.departmentPayroll")}
          </h3>
          {departmentChart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </p>
          ) : isMobile ? (
            <SafeResponsiveChart height={220} mobileHeight={220}>
              <BarChart
                layout="vertical"
                data={departmentChart}
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => compactMoney(Number(v), loc)}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={72}
                  tick={<ChartRtlTick fontSize={10} />}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => formatEgp(Number(value ?? 0), loc)}
                />
                <Legend {...legendProps} />
                <Bar
                  dataKey="net"
                  name={t("payroll.netSalary")}
                  fill="var(--primary)"
                  radius={[0, 6, 6, 0]}
                  barSize={12}
                />
                <Bar
                  dataKey="deductions"
                  name={t("payroll.deductions")}
                  fill="hsl(var(--destructive))"
                  radius={[0, 6, 6, 0]}
                  barSize={12}
                />
              </BarChart>
            </SafeResponsiveChart>
          ) : (
            <SafeResponsiveChart height={260}>
              <BarChart data={departmentChart} margin={barMargin}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={<ChartRtlTick fontSize={11} />}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} width={yAxisWidth} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => formatEgp(Number(value ?? 0), loc)}
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

        <section className="surface-panel overflow-hidden p-3 sm:p-4">
          <h3 className="mb-2 text-[0.9rem] font-semibold sm:mb-3 sm:text-[0.95rem]">
            {t("payroll.reportDeductions")}
          </h3>
          {deductionChart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </p>
          ) : (
            <SafeResponsiveChart height={260} mobileHeight={230}>
              <PieChart>
                <Pie
                  data={deductionChart}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={isMobile ? 42 : 58}
                  outerRadius={isMobile ? 72 : 90}
                  paddingAngle={2}
                >
                  {deductionChart.map((row, i) => (
                    <Cell
                      key={row.name}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => formatEgp(Number(value ?? 0), loc)}
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{
                    fontSize: isMobile ? 11 : 12,
                    paddingTop: 4,
                  }}
                />
              </PieChart>
            </SafeResponsiveChart>
          )}
        </section>
      </div>

      <section className="surface-panel overflow-hidden p-3 sm:p-4">
        <h3 className="mb-2 text-[0.9rem] font-semibold sm:mb-3 sm:text-[0.95rem]">
          {t("payroll.monthlyComparison")}
        </h3>
        <SafeResponsiveChart height={280} mobileHeight={220}>
          <BarChart data={monthlyChart} margin={barMargin}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <YAxis
              tick={{ fontSize: isMobile ? 10 : 11 }}
              width={yAxisWidth}
              tickFormatter={(v) =>
                isMobile ? compactMoney(Number(v), loc) : String(v)
              }
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => formatEgp(Number(value ?? 0), loc)}
            />
            <Legend {...legendProps} />
            <Bar
              dataKey="net"
              name={t("payroll.netPayroll")}
              fill="var(--primary)"
              radius={[6, 6, 0, 0]}
              maxBarSize={isMobile ? 18 : 32}
            />
            <Bar
              dataKey="overtime"
              name={t("payroll.overtime")}
              fill="var(--chart-1)"
              radius={[6, 6, 0, 0]}
              maxBarSize={isMobile ? 18 : 32}
            />
          </BarChart>
        </SafeResponsiveChart>
      </section>

      {yearlyChart.length > 0 ? (
        <section className="surface-panel overflow-hidden p-3 sm:p-4">
          <h3 className="mb-2 text-[0.9rem] font-semibold sm:mb-3 sm:text-[0.95rem]">
            {t("payroll.yearlyComparison")}
          </h3>
          <SafeResponsiveChart height={240} mobileHeight={200}>
            <BarChart data={yearlyChart} margin={barMargin}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 11 }}
                width={yAxisWidth}
                tickFormatter={(v) =>
                  isMobile ? compactMoney(Number(v), loc) : String(v)
                }
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value) => formatEgp(Number(value ?? 0), loc)}
              />
              <Bar
                dataKey="net"
                name={t("payroll.netPayroll")}
                fill="var(--chart-2)"
                radius={[6, 6, 0, 0]}
                maxBarSize={isMobile ? 28 : 48}
              />
            </BarChart>
          </SafeResponsiveChart>
        </section>
      ) : null}

      {/* Mobile cards — avoid wide table pinch-scroll as the only view */}
      <section className="space-y-2 md:hidden">
        <h3 className="px-1 text-[0.9rem] font-semibold">
          {t("payroll.departmentPayroll")}
        </h3>
        {(reports.departmentRows ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </p>
        ) : (
          <ul className="space-y-2">
            {(reports.departmentRows ?? []).map((row) => (
              <li
                key={row.department}
                className="rounded-xl border border-border/70 bg-card px-3 py-3"
              >
                <p className="text-[13px] font-semibold">{row.department}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("payroll.headcount")}: {row.headcount ?? 0}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-1.5 text-center">
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                    <dt className="text-[10px] text-muted-foreground">
                      {t("payroll.gross")}
                    </dt>
                    <dd className="text-[12px] tabular-nums">
                      {formatEgp(row.gross, loc)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                    <dt className="text-[10px] text-muted-foreground">
                      {t("payroll.netSalary")}
                    </dt>
                    <dd className="text-[12px] font-semibold tabular-nums">
                      {formatEgp(row.net, loc)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                    <dt className="text-[10px] text-muted-foreground">
                      {t("payroll.deductions")}
                    </dt>
                    <dd className="text-[12px] tabular-nums text-rose-700 dark:text-rose-300">
                      {formatEgp(row.deductions ?? 0, loc)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                    <dt className="text-[10px] text-muted-foreground">
                      {t("payroll.overtime")}
                    </dt>
                    <dd className="text-[12px] tabular-nums">
                      {formatEgp(row.overtime ?? 0, loc)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-panel hidden overflow-hidden md:block">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.departmentPayroll")}
          </h3>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border/70 bg-muted/30 text-start text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">
                  {t("common.department")}
                </th>
                <th className="px-4 py-2.5 font-medium">
                  {t("payroll.headcount")}
                </th>
                <th className="px-4 py-2.5 font-medium">{t("payroll.gross")}</th>
                <th className="px-4 py-2.5 font-medium">
                  {t("payroll.deductions")}
                </th>
                <th className="px-4 py-2.5 font-medium">
                  {t("payroll.overtime")}
                </th>
                <th className="px-4 py-2.5 font-medium">
                  {t("payroll.netSalary")}
                </th>
                <th className="px-4 py-2.5 font-medium">
                  {t("payroll.employerCost")}
                </th>
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
