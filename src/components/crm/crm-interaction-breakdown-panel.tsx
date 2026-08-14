"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { ensureInteractionBreakdown } from "@/lib/crm-dashboard-normalize";
import { cn } from "@/lib/utils";
import type { CrmInteractionBreakdown } from "@/types/crm";

interface CrmInteractionBreakdownPanelProps {
  breakdown: CrmInteractionBreakdown | null | undefined;
  className?: string;
}

/** Day / hour / client call+meeting breakdown for Performance & Reports. */
export function CrmInteractionBreakdownPanel({
  breakdown: raw,
  className,
}: CrmInteractionBreakdownPanelProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const breakdown = ensureInteractionBreakdown(raw);

  const dayChart = useMemo(
    () =>
      breakdown.byDay.map((row) => ({
        ...row,
        label: (() => {
          try {
            return format(parseISO(row.date), "d MMM", { locale: dateLocale });
          } catch {
            return row.date;
          }
        })(),
      })),
    [breakdown.byDay, dateLocale]
  );

  const hourChart = useMemo(
    () =>
      breakdown.byHour.filter(
        (row) =>
          row.activeCalls > 0 || row.inactiveCalls > 0 || row.meetings > 0
      ),
    [breakdown.byHour]
  );

  const totals = breakdown.totals;
  const hasData =
    totals.activeCalls > 0 ||
    totals.inactiveCalls > 0 ||
    totals.meetings > 0 ||
    breakdown.byClient.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <section className="surface-panel">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("crm.interactions.summaryTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("crm.interactions.summaryDesc")}
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t("crm.performance.colActiveCalls"),
              value: totals.activeCalls,
              className: "text-emerald-700 dark:text-emerald-400",
            },
            {
              label: t("crm.performance.colInactiveCalls"),
              value: totals.inactiveCalls,
              className: "text-rose-700 dark:text-rose-400",
            },
            {
              label: t("crm.interactions.meetings"),
              value: totals.meetings,
            },
            {
              label: t("crm.interactions.meetingsSplit"),
              value: `${totals.meetingsOnline}/${totals.meetingsOffline}`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/70 px-3 py-2.5"
            >
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p
                className={cn(
                  "mt-1 font-mono text-lg font-semibold tabular-nums",
                  item.className
                )}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 border-t border-border/60 px-4 py-3 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground">
            {t("crm.interactions.ourCompany")}:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {totals.meetingsOurCompany}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {t("crm.interactions.clientCompany")}:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {totals.meetingsClientCompany}
            </span>
          </p>
        </div>
      </section>

      {!hasData ? (
        <EmptyState
          title={t("crm.interactions.empty")}
          description={t("crm.interactions.summaryDesc")}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-panel overflow-hidden">
              <div className="panel-header">
                <h3 className="text-[0.95rem] font-semibold tracking-tight">
                  {t("crm.interactions.byDayTitle")}
                </h3>
              </div>
              <div className="panel-body h-[260px]">
                {dayChart.length === 0 ? (
                  <EmptyState compact title={t("crm.empty.chart")} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dayChart}
                      margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar
                        dataKey="activeCalls"
                        name={t("crm.performance.colActiveCalls")}
                        fill={CHART.present}
                        radius={[4, 4, 0, 0]}
                        animationDuration={reduceMotion ? 0 : 700}
                      />
                      <Bar
                        dataKey="inactiveCalls"
                        name={t("crm.performance.colInactiveCalls")}
                        fill={CHART.absent}
                        radius={[4, 4, 0, 0]}
                        animationDuration={reduceMotion ? 0 : 700}
                      />
                      <Bar
                        dataKey="meetings"
                        name={t("crm.interactions.meetings")}
                        fill={CHART.rate}
                        radius={[4, 4, 0, 0]}
                        animationDuration={reduceMotion ? 0 : 700}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="surface-panel overflow-hidden">
              <div className="panel-header">
                <h3 className="text-[0.95rem] font-semibold tracking-tight">
                  {t("crm.interactions.byHourTitle")}
                </h3>
              </div>
              <div className="panel-body h-[260px]">
                {hourChart.length === 0 ? (
                  <EmptyState compact title={t("crm.empty.chart")} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hourChart}
                      margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar
                        dataKey="activeCalls"
                        name={t("crm.performance.colActiveCalls")}
                        fill={CHART.present}
                        radius={[4, 4, 0, 0]}
                        animationDuration={reduceMotion ? 0 : 700}
                      />
                      <Bar
                        dataKey="inactiveCalls"
                        name={t("crm.performance.colInactiveCalls")}
                        fill={CHART.absent}
                        radius={[4, 4, 0, 0]}
                        animationDuration={reduceMotion ? 0 : 700}
                      />
                      <Bar
                        dataKey="meetings"
                        name={t("crm.interactions.meetings")}
                        fill={CHART.rate}
                        radius={[4, 4, 0, 0]}
                        animationDuration={reduceMotion ? 0 : 700}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <section className="surface-panel">
            <div className="panel-header">
              <h3 className="text-[0.95rem] font-semibold tracking-tight">
                {t("crm.interactions.byClientTitle")}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("crm.interactions.byClientDesc")}
              </p>
            </div>
            {breakdown.byClient.length === 0 ? (
              <div className="p-6">
                <EmptyState compact title={t("crm.interactions.empty")} />
              </div>
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead>{t("crm.interactions.colClient")}</DataTableHead>
                    <DataTableHead>{t("crm.interactions.colDate")}</DataTableHead>
                    <DataTableHead className="text-end">
                      {t("crm.interactions.colThatDay")}
                    </DataTableHead>
                    <DataTableHead className="text-end">
                      {t("crm.interactions.colTotal")}
                    </DataTableHead>
                    <DataTableHead className="hidden text-end md:table-cell">
                      {t("crm.performance.colActiveCalls")}
                    </DataTableHead>
                    <DataTableHead className="hidden text-end md:table-cell">
                      {t("crm.performance.colInactiveCalls")}
                    </DataTableHead>
                    <DataTableHead className="text-end">
                      {t("crm.interactions.meetings")}
                    </DataTableHead>
                  </DataTableHeaderRow>
                </DataTableHeader>
                <DataTableBody>
                  {breakdown.byClient.slice(0, 50).map((row) => (
                    <DataTableRow key={`${row.leadId}-${row.date}-${row.ownerEmployeeId}`}>
                      <DataTableCell>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">
                            {row.leadName}
                          </p>
                          {row.ownerEmployeeName ? (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {row.ownerEmployeeName}
                            </p>
                          ) : null}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="font-mono text-[12px] tabular-nums">
                        {row.date}
                      </DataTableCell>
                      <DataTableCell className="text-end font-mono tabular-nums">
                        {row.contactsThatDay}
                      </DataTableCell>
                      <DataTableCell className="text-end font-mono tabular-nums">
                        {row.contactsTotal}
                      </DataTableCell>
                      <DataTableCell className="hidden text-end font-mono tabular-nums text-emerald-700 dark:text-emerald-400 md:table-cell">
                        {row.activeCalls}
                      </DataTableCell>
                      <DataTableCell className="hidden text-end font-mono tabular-nums text-rose-700 dark:text-rose-400 md:table-cell">
                        {row.inactiveCalls}
                      </DataTableCell>
                      <DataTableCell className="text-end font-mono tabular-nums">
                        {row.meetings}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </section>
        </>
      )}
    </div>
  );
}
