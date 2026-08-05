"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { EmployeeAttendanceSummary } from "@/components/employees/profile-data";

export function EmployeeAttendanceSummaryCards({
  summary,
}: {
  summary: EmployeeAttendanceSummary;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const items = [
    {
      label: t("employees.presentDays"),
      value: summary.presentDays,
      suffix: undefined as string | undefined,
      decimals: 0,
    },
    {
      label: t("employees.lateDays"),
      value: summary.lateDays,
      suffix: undefined,
      decimals: 0,
    },
    {
      label: t("employees.absentDays"),
      value: summary.absentDays,
      suffix: undefined,
      decimals: 0,
    },
    {
      label: t("employees.workingHoursMonth"),
      value: summary.workingHours,
      suffix: "h",
      decimals: 0,
    },
    {
      label: t("employees.avgArrival"),
      value: summary.averageArrival,
      isText: true as boolean | undefined,
    },
    {
      label: t("employees.attendancePct"),
      value: summary.attendanceRate,
      suffix: "%",
      decimals: 1,
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={fadeInUp}
          className="rounded-xl border border-border bg-muted/30 px-3.5 py-3"
        >
          <p className="section-label">{item.label}</p>
          {"isText" in item && item.isText ? (
            <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums">
              {item.value}
            </p>
          ) : (
            <p className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight">
              <AnimatedCounter
                value={item.value as number}
                suffix={item.suffix}
                decimals={item.decimals}
              />
            </p>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
