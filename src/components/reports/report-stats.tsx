"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Timer,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import type { ReportSummaryStats } from "@/lib/reports/compute-analytics";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { TranslationPath } from "@/i18n";

export function ReportStats({ summary }: { summary: ReportSummaryStats }) {
  const { t } = useTranslation();

  const items: {
    labelKey: TranslationPath;
    value: number;
    icon: typeof Users;
    tone: string;
    suffix?: string;
    decimals?: number;
  }[] = [
    {
      labelKey: "reports.statsPresent",
      value: summary.present,
      icon: UserCheck,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
    {
      labelKey: "reports.statsLate",
      value: summary.late,
      icon: Clock,
      tone: "text-amber-700 dark:text-amber-400",
    },
    {
      labelKey: "reports.statsAbsent",
      value: summary.absent,
      icon: UserX,
      tone: "text-rose-700 dark:text-rose-400",
    },
    {
      labelKey: "reports.statsRate",
      value: summary.attendanceRate,
      icon: TrendingUp,
      tone: "text-primary",
      suffix: "%",
      decimals: 1,
    },
    {
      labelKey: "reports.statsHours",
      value: summary.avgHours,
      icon: Timer,
      tone: "text-teal-800 dark:text-teal-300",
      suffix: "h",
      decimals: 1,
    },
    {
      labelKey: "dashboard.totalEmployees",
      value: summary.totalEmployees,
      icon: Users,
      tone: "text-sky-700 dark:text-sky-300",
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      role="list"
    >
      {items.map((item) => (
        <motion.div key={item.labelKey} variants={fadeInUp} role="listitem">
          <KpiCard
            label={t(item.labelKey)}
            value={item.value}
            icon={item.icon}
            tone={item.tone}
            suffix={item.suffix}
            decimals={item.decimals ?? 0}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
