"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnalyticsChartsStudio } from "@/components/reports/analytics-charts-studio";
import { EmployeeActivityTable } from "@/components/reports/employee-activity-table";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { DailyReportRow } from "@/types";

export function LeaveAnalyticsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const cards = [
    {
      id: "balance",
      label: t("analytics.leaveBalance"),
      value: "—",
      hint: t("analytics.leaveBalanceHint"),
    },
    {
      id: "util",
      label: t("analytics.leaveUtilization"),
      value: "—",
      hint: t("analytics.leaveUtilHint"),
    },
    {
      id: "upcoming",
      label: t("analytics.upcomingLeave"),
      value: "—",
      hint: t("analytics.upcomingLeaveHint"),
    },
    {
      id: "pending",
      label: t("analytics.leaveApproval"),
      value: "—",
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
        {cards.map((card) => (
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
      <AnalyticsChartsStudio focus="leave" />
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
