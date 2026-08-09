"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AttendanceTrendChart,
  CompanyRadarChart,
  HoursTrendChart,
  LateTrendChart,
  LeaveUtilChart,
  WfhCompareCharts,
} from "./analytics-chart-groups";

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
          <AttendanceTrendChart trend={trend} title={t("analytics.attendanceTrend")} />
        )}

        {(focus === "hours" || focus === "all") && (
          <HoursTrendChart
            trend={trend}
            title={t("analytics.hoursTrend")}
            hoursLabel={t("common.hours")}
            overtimeLabel={t("analytics.overtime")}
          />
        )}

        {(focus === "late" || focus === "all") && (
          <LateTrendChart
            trend={trend}
            title={t("analytics.lateTrend")}
            lateLabel={t("charts.late")}
          />
        )}

        {(focus === "wfh" || focus === "all") && (
          <WfhCompareCharts
            trend={trend}
            pie={pie}
            compareTitle={t("analytics.wfhCompare")}
            mixTitle={t("analytics.workModeMix")}
            officeLabel={t("analytics.modeOffice")}
            hybridLabel={t("analytics.modeHybrid")}
            remoteLabel={t("analytics.modeRemote")}
          />
        )}

        {(focus === "leave" || focus === "all") && (
          <LeaveUtilChart
            leave={leave}
            title={t("analytics.leaveUtilChart")}
            approvedLabel={t("common.approved")}
            pendingLabel={t("common.pending")}
            remainingLabel={t("employees.leaveRemaining")}
          />
        )}

        {focus === "all" && (
          <CompanyRadarChart
            radar={radar}
            title={t("analytics.radarTitle")}
            hint={t("analytics.radarHint")}
            scoreLabel={t("analytics.companyScore")}
          />
        )}
      </div>
    </motion.div>
  );
}
