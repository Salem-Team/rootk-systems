"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import {
  buildLeaveAnalytics,
  buildModePie,
  buildMonthlyTrends,
  buildQuarterlyTrends,
  buildRadarScores,
  buildWeeklyTrends,
} from "@/components/reports/analytics-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { TranslationPath } from "@/i18n";

const tooltipStyle = chartTooltipStyle;

const DAY_KEYS: Record<string, TranslationPath> = {
  Sun: "days.sun",
  Mon: "days.mon",
  Tue: "days.tue",
  Wed: "days.wed",
  Thu: "days.thu",
  Fri: "days.fri",
  Sat: "days.sat",
};

const MONTH_KEYS: Record<string, TranslationPath> = {
  Mar: "months.Mar",
  Apr: "months.Apr",
  May: "months.May",
  Jun: "months.Jun",
  Jul: "months.Jul",
  Aug: "months.Aug",
};

function localizeTrend(
  rows: ReturnType<typeof buildWeeklyTrends>,
  t: (k: TranslationPath) => string
) {
  return rows.map((row) => ({
    ...row,
    label: DAY_KEYS[row.label]
      ? t(DAY_KEYS[row.label])
      : MONTH_KEYS[row.label]
        ? t(MONTH_KEYS[row.label])
        : row.label,
  }));
}

export function AnalyticsChartsStudio({
  focus = "attendance",
}: {
  focus?: "attendance" | "hours" | "late" | "wfh" | "leave" | "all";
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [period, setPeriod] = useState<"weekly" | "monthly" | "quarterly">(
    "weekly"
  );

  const trendRaw =
    period === "weekly"
      ? buildWeeklyTrends()
      : period === "monthly"
        ? buildMonthlyTrends()
        : buildQuarterlyTrends();

  const trend = useMemo(
    () => localizeTrend(trendRaw, t),
    [trendRaw, t]
  );

  const leave = useMemo(
    () =>
      buildLeaveAnalytics().map((r) => ({
        ...r,
        label: MONTH_KEYS[r.label] ? t(MONTH_KEYS[r.label]) : r.label,
      })),
    [t]
  );

  const pie = useMemo(
    () =>
      buildModePie().map((p) => ({
        ...p,
        name: t(p.nameKey as TranslationPath),
      })),
    [t]
  );

  const radar = useMemo(
    () =>
      buildRadarScores().map((r) => ({
        subject: t(r.subjectKey as TranslationPath),
        score: r.score,
      })),
    [t]
  );

  return (
    <motion.div
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("analytics.chartsStudio")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("analytics.chartsStudioDesc")}
          </p>
        </div>
        <Tabs
          value={period}
          onValueChange={(v) =>
            setPeriod(v as "weekly" | "monthly" | "quarterly")
          }
        >
          <TabsList>
            <TabsTrigger value="weekly">{t("analytics.weekly")}</TabsTrigger>
            <TabsTrigger value="monthly">{t("analytics.monthly")}</TabsTrigger>
            <TabsTrigger value="quarterly">{t("analytics.quarterly")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(focus === "attendance" || focus === "all") && (
          <ChartPanel title={t("analytics.attendanceTrend")}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART.present} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={CHART.present} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="attendance"
                  name={t("charts.present")}
                  stroke={CHART.present}
                  fill="url(#attFill)"
                  strokeWidth={2.25}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>
        )}

        {(focus === "hours" || focus === "all") && (
          <ChartPanel title={t("analytics.hoursTrend")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hours"
                  name={t("common.hours")}
                  stroke={CHART.hours}
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="overtime"
                  name={t("analytics.overtime")}
                  stroke={CHART.accent}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        )}

        {(focus === "late" || focus === "all") && (
          <ChartPanel title={t("analytics.lateTrend")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="late"
                  name={t("charts.late")}
                  fill={CHART.late}
                  radius={[6, 6, 0, 0]}
                  animationDuration={900}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        )}

        {(focus === "wfh" || focus === "all") && (
          <>
            <ChartPanel title={t("analytics.wfhCompare")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="office" stackId="a" name={t("analytics.modeOffice")} fill={CHART.rate} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="hybrid" stackId="a" name={t("analytics.modeHybrid")} fill={CHART.wfh} />
                  <Bar dataKey="wfh" stackId="a" name={t("analytics.modeRemote")} fill={CHART.present} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title={t("analytics.workModeMix")}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    animationDuration={900}
                  >
                    {pie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>
          </>
        )}

        {(focus === "leave" || focus === "all") && (
          <ChartPanel title={t("analytics.leaveUtilChart")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leave}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="approved" name={t("common.approved")} fill={CHART.present} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name={t("common.pending")} fill={CHART.late} radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" name={t("employees.leaveRemaining")} fill={CHART.wfh} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        )}

        {focus === "all" && (
          <ChartPanel title={t("analytics.radarTitle")} hint={t("analytics.radarHint")}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name={t("analytics.companyScore")}
                  dataKey="score"
                  stroke={CHART.rate}
                  fill={CHART.rate}
                  fillOpacity={0.2}
                  animationDuration={1000}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ChartPanel>
        )}
      </div>
    </motion.div>
  );
}

function ChartPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h4 className="text-[0.95rem] font-semibold tracking-tight">{title}</h4>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div
        className="panel-body h-[260px] sm:h-[280px]"
        role="img"
        aria-label={title}
      >
        {children}
      </div>
    </section>
  );
}
