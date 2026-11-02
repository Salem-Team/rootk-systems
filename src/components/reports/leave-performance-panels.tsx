"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnalyticsChartsStudio } from "@/components/reports/analytics-charts-studio";
import { EmployeeActivityTable } from "@/components/reports/employee-activity-table";
import type { AnalyticsBundle } from "@/lib/reports/compute-analytics";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { DailyReportRow } from "@/types";

export function LeaveAnalyticsPanel({
  analytics,
}: {
  analytics: AnalyticsBundle | null;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const cards = analytics?.leaveCards;

  const rows = [
    {
      id: "balance",
      label: t("analytics.leaveBalance"),
      value: cards ? String(Math.max(0, 20 - cards.onLeaveDays)) : "—",
      hint: t("analytics.leaveBalanceHint"),
    },
    {
      id: "util",
      label: t("analytics.leaveUtilization"),
      value: cards ? `${cards.leaveSharePct}%` : "—",
      hint: t("analytics.leaveUtilHint"),
    },
    {
      id: "upcoming",
      label: t("analytics.upcomingLeave"),
      value: cards ? String(cards.onLeaveDays) : "—",
      hint: t("analytics.upcomingLeaveHint"),
    },
    {
      id: "pending",
      label: t("analytics.leaveApproval"),
      value: cards ? String(cards.pendingCount) : "—",
      hint: t("analytics.leaveApprovalHint"),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {rows.map((card) => (
          <motion.li
            key={card.id}
            variants={fadeInUp}
            className="surface-panel p-4"
          >
            <p className="section-label !mb-0">{card.label}</p>
            <p className="stat-value mt-2 text-[1.45rem]">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </motion.li>
        ))}
      </motion.ul>
      <AnalyticsChartsStudio
        focus="leave"
        weeklyTrends={analytics?.weeklyTrends}
        monthlyTrends={analytics?.monthlyTrends}
        quarterlyTrends={analytics?.quarterlyTrends}
        leaveSeries={analytics?.leaveSeries}
        modePie={analytics?.modePie}
        radar={analytics?.radar}
      />
    </div>
  );
}

export function PerformanceOverviewPanel({ rows }: { rows: DailyReportRow[] }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold tracking-tight">
          {t("analytics.performanceTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("analytics.performanceDesc")}
        </p>
      </div>
      <EmployeeActivityTable rows={rows} />
    </div>
  );
}
