"use client";

import { useMemo, useState } from "react";
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
import { CrmCallFeedbackDialog } from "@/components/crm/crm-call-feedback-dialog";
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
import { formatClockHm } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type {
  CrmClientCallRow,
  CrmInteractionBreakdown,
  CrmInteractionCallDetail,
} from "@/types/crm";

interface CrmInteractionBreakdownPanelProps {
  breakdown: CrmInteractionBreakdown | null | undefined;
  className?: string;
}

type CallDrilldown = {
  answered: boolean;
  leadName: string;
  date: string;
  calls: CrmInteractionCallDetail[];
};

function filterClientCalls(
  calls: CrmInteractionCallDetail[],
  row: CrmClientCallRow,
  answered: boolean
): CrmInteractionCallDetail[] {
  return calls.filter(
    (call) =>
      call.leadId === row.leadId &&
      call.date === row.date &&
      call.callAnswered === answered &&
      (row.ownerEmployeeId
        ? call.ownerEmployeeId === row.ownerEmployeeId
        : true)
  );
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
  const [drilldown, setDrilldown] = useState<CallDrilldown | null>(null);

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
      breakdown.byHour
        .filter(
          (row) =>
            row.activeCalls > 0 || row.inactiveCalls > 0 || row.meetings > 0
        )
        .map((row) => ({
          ...row,
          label: formatClockHm(
            `${String(row.hour).padStart(2, "0")}:00`,
            locale
          ),
        })),
    [breakdown.byHour, locale]
  );

  const totals = breakdown.totals;
  const hasData =
    totals.activeCalls > 0 ||
    totals.inactiveCalls > 0 ||
    totals.meetings > 0 ||
    breakdown.byClient.length > 0;

  function openClientCalls(row: CrmClientCallRow, answered: boolean) {
    const count = answered ? row.activeCalls : row.inactiveCalls;
    if (count <= 0) return;
    setDrilldown({
      answered,
      leadName: row.leadName,
      date: row.date,
      calls: filterClientCalls(breakdown.calls, row, answered),
    });
  }

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
              <div className="panel-body h-[220px] sm:h-[260px]">
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
              <div className="panel-body h-[220px] sm:h-[260px]">
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
              <>
                <ul className="grid gap-2 p-3 md:hidden">
                  {breakdown.byClient.slice(0, 50).map((row) => (
                    <li
                      key={`${row.leadId}-${row.date}-${row.ownerEmployeeId}`}
                      className="rounded-xl border border-border/70 bg-card px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
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
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {row.date}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div>
                          <p>{t("crm.interactions.colThatDay")}</p>
                          <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                            {row.contactsThatDay}
                          </p>
                        </div>
                        <div>
                          <p>{t("crm.interactions.colTotal")}</p>
                          <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                            {row.contactsTotal}
                          </p>
                        </div>
                        <div>
                          <p>{t("crm.performance.colActiveCalls")}</p>
                          {row.activeCalls > 0 ? (
                            <button
                              type="button"
                              onClick={() => openClientCalls(row, true)}
                              className="min-h-9 min-w-9 font-mono text-[13px] font-semibold tabular-nums text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                            >
                              {row.activeCalls}
                            </button>
                          ) : (
                            <p className="font-mono text-[13px] font-semibold tabular-nums text-emerald-700/50">
                              0
                            </p>
                          )}
                        </div>
                        <div>
                          <p>{t("crm.performance.colInactiveCalls")}</p>
                          {row.inactiveCalls > 0 ? (
                            <button
                              type="button"
                              onClick={() => openClientCalls(row, false)}
                              className="min-h-9 min-w-9 font-mono text-[13px] font-semibold tabular-nums text-rose-700 underline-offset-2 hover:underline dark:text-rose-400"
                            >
                              {row.inactiveCalls}
                            </button>
                          ) : (
                            <p className="font-mono text-[13px] font-semibold tabular-nums text-rose-700/50">
                              0
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <DataTable>
                    <DataTableHeader>
                      <DataTableHeaderRow>
                        <DataTableHead>
                          {t("crm.interactions.colClient")}
                        </DataTableHead>
                        <DataTableHead>
                          {t("crm.interactions.colDate")}
                        </DataTableHead>
                        <DataTableHead className="text-end">
                          {t("crm.interactions.colThatDay")}
                        </DataTableHead>
                        <DataTableHead className="text-end">
                          {t("crm.interactions.colTotal")}
                        </DataTableHead>
                        <DataTableHead className="text-end">
                          {t("crm.performance.colActiveCalls")}
                        </DataTableHead>
                        <DataTableHead className="text-end">
                          {t("crm.performance.colInactiveCalls")}
                        </DataTableHead>
                        <DataTableHead className="text-end">
                          {t("crm.interactions.meetings")}
                        </DataTableHead>
                      </DataTableHeaderRow>
                    </DataTableHeader>
                    <DataTableBody>
                      {breakdown.byClient.slice(0, 50).map((row) => (
                        <DataTableRow
                          key={`${row.leadId}-${row.date}-${row.ownerEmployeeId}`}
                        >
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
                          <DataTableCell className="text-end">
                            {row.activeCalls > 0 ? (
                              <button
                                type="button"
                                onClick={() => openClientCalls(row, true)}
                                className="min-h-9 min-w-9 px-1 font-mono tabular-nums text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-400"
                                aria-label={`${t("crm.performance.colActiveCalls")}: ${row.activeCalls}`}
                              >
                                {row.activeCalls}
                              </button>
                            ) : (
                              <span className="font-mono tabular-nums text-emerald-700/50 dark:text-emerald-400/50">
                                0
                              </span>
                            )}
                          </DataTableCell>
                          <DataTableCell className="text-end">
                            {row.inactiveCalls > 0 ? (
                              <button
                                type="button"
                                onClick={() => openClientCalls(row, false)}
                                className="min-h-9 min-w-9 px-1 font-mono tabular-nums text-rose-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-rose-400"
                                aria-label={`${t("crm.performance.colInactiveCalls")}: ${row.inactiveCalls}`}
                              >
                                {row.inactiveCalls}
                              </button>
                            ) : (
                              <span className="font-mono tabular-nums text-rose-700/50 dark:text-rose-400/50">
                                0
                              </span>
                            )}
                          </DataTableCell>
                          <DataTableCell className="text-end font-mono tabular-nums">
                            {row.meetings}
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                </div>
              </>
            )}
          </section>
        </>
      )}

      <CrmCallFeedbackDialog
        open={Boolean(drilldown)}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
        title={
          drilldown
            ? t("crm.interactions.callDetailsTitle", {
                status: drilldown.answered
                  ? t("crm.feedback.activeCall")
                  : t("crm.feedback.inactiveCall"),
              })
            : ""
        }
        description={
          drilldown
            ? t("crm.interactions.callDetailsDesc", {
                lead: drilldown.leadName,
                date: drilldown.date,
                count: String(drilldown.calls.length),
              })
            : undefined
        }
        calls={drilldown?.calls ?? []}
      />
    </div>
  );
}
