"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { buildWeeklySummary } from "@/components/attendance/attendance-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { AttendanceRecord } from "@/types";

interface WeeklySummaryProps {
  records: AttendanceRecord[];
}

export function WeeklySummary({ records }: WeeklySummaryProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const summary = buildWeeklySummary(records);

  const items = [
    {
      label: t("attendance.weekHours"),
      value: summary.hoursWorked,
      suffix: "h",
      decimals: 1,
    },
    {
      label: t("attendance.weekPresent"),
      value: summary.presentDays,
      suffix: undefined as string | undefined,
      decimals: 0,
    },
    {
      label: t("attendance.weekLate"),
      value: summary.lateDays,
      suffix: undefined,
      decimals: 0,
    },
    {
      label: t("attendance.weekAbsent"),
      value: summary.absentDays,
      suffix: undefined,
      decimals: 0,
    },
    {
      label: t("attendance.weekOvertime"),
      value: summary.overtimeHours,
      suffix: "h",
      decimals: 1,
    },
    {
      label: t("attendance.weekRate"),
      value: summary.attendanceRate,
      suffix: "%",
      decimals: 1,
    },
  ];

  return (
    <section aria-labelledby="weekly-summary-heading" className="space-y-3">
      <div>
        <h3
          id="weekly-summary-heading"
          className="text-base font-semibold tracking-tight"
        >
          {t("attendance.weeklySummary")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("attendance.weeklySummaryDesc")}
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {items.map((item) => (
          <motion.div
            key={item.label}
            variants={fadeInUp}
            className="surface-panel surface-panel-interactive surface-shine px-3.5 py-3"
          >
            <p className="section-label">{item.label}</p>
            <p className="stat-value mt-1.5 text-xl">
              <AnimatedCounter
                value={item.value}
                suffix={item.suffix}
                decimals={item.decimals}
              />
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
