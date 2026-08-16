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
import { CrmInteractionByClient } from "@/components/crm/crm-interaction-by-client";
import {
  CrmInteractionSummaryCards,
  INTERACTION_SUMMARY_LABEL_PATH,
} from "@/components/crm/crm-interaction-summary-cards";
import { EmptyState } from "@/components/shared/empty-state";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { ensureInteractionBreakdown } from "@/lib/crm-dashboard-normalize";
import {
  filterCallsBySummaryKind,
  filterClientDayCalls,
  type CrmInteractionSummaryKind,
} from "@/lib/crm/interaction-analytics";
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
  title: string;
  description: string;
  calls: CrmInteractionCallDetail[];
};

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

  function openSummary(kind: CrmInteractionSummaryKind) {
    const calls = filterCallsBySummaryKind(breakdown.calls, kind);
    const label = t(INTERACTION_SUMMARY_LABEL_PATH[kind]);
    const clientCount = new Set(calls.map((call) => call.leadId)).size;
    setDrilldown({
      title: t("crm.interactions.summaryDetailsTitle", { label }),
      description: t("crm.interactions.summaryDetailsDesc", {
        count: String(clientCount),
      }),
      calls,
    });
  }

  function openClientCalls(row: CrmClientCallRow, answered: boolean) {
    const count = answered ? row.activeCalls : row.inactiveCalls;
    if (count <= 0) return;
    const calls = filterClientDayCalls(breakdown.calls, row, answered);
    setDrilldown({
      title: t("crm.interactions.callDetailsTitle", {
        status: answered
          ? t("crm.feedback.activeCall")
          : t("crm.feedback.inactiveCall"),
      }),
      description: t("crm.interactions.callDetailsDesc", {
        lead: row.leadName,
        date: row.date,
        count: String(calls.length),
      }),
      calls,
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
        <CrmInteractionSummaryCards totals={totals} onSelect={openSummary} />
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
              <CrmInteractionByClient
                rows={breakdown.byClient}
                onOpenCalls={openClientCalls}
              />
            )}
          </section>
        </>
      )}

      <CrmCallFeedbackDialog
        open={Boolean(drilldown)}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
        title={drilldown?.title ?? ""}
        description={drilldown?.description}
        calls={drilldown?.calls ?? []}
      />
    </div>
  );
}
