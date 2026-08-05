"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnalyticsChartsStudio } from "@/components/reports/analytics-charts-studio";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const MOCK_LEAVE_SUMMARY = [
  { id: "balance", value: "1,248", unit: "days" },
  { id: "util", value: "62%", unit: "" },
  { id: "upcoming", value: "14", unit: "people" },
  { id: "pending", value: "9", unit: "requests" },
];

const MOCK_PERFORMANCE = [
  { name: "Sara Hassan", dept: "Engineering", score: 96, streak: 42 },
  { name: "Omar Nabil", dept: "Product", score: 93, streak: 31 },
  { name: "Nour El-Sayed", dept: "Design", score: 91, streak: 28 },
  { name: "Youssef Mansour", dept: "Operations", score: 89, streak: 21 },
  { name: "Mona Farid", dept: "HR", score: 88, streak: 19 },
  { name: "Karim Adel", dept: "Finance", score: 86, streak: 17 },
];

export function LeaveAnalyticsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const cards = [
    {
      id: "balance",
      label: t("analytics.leaveBalance"),
      value: MOCK_LEAVE_SUMMARY[0].value,
      hint: t("analytics.leaveBalanceHint"),
    },
    {
      id: "util",
      label: t("analytics.leaveUtilization"),
      value: MOCK_LEAVE_SUMMARY[1].value,
      hint: t("analytics.leaveUtilHint"),
    },
    {
      id: "upcoming",
      label: t("analytics.upcomingLeave"),
      value: MOCK_LEAVE_SUMMARY[2].value,
      hint: t("analytics.upcomingLeaveHint"),
    },
    {
      id: "pending",
      label: t("analytics.leaveApproval"),
      value: MOCK_LEAVE_SUMMARY[3].value,
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

export function PerformanceOverviewPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

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
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {MOCK_PERFORMANCE.map((row) => (
          <motion.li
            key={row.name}
            variants={fadeInUp}
            className="surface-panel surface-panel-interactive p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.dept}</p>
              </div>
              <Badge variant="info" className="tabular-nums">
                {row.score}
              </Badge>
            </div>
            <Progress value={row.score} className="mt-3 h-1.5" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("analytics.perfectStreak", { days: row.streak })}
            </p>
          </motion.li>
        ))}
      </motion.ul>
      <p className="text-xs text-muted-foreground">{t("analytics.uiOnlyNote")}</p>
    </div>
  );
}
