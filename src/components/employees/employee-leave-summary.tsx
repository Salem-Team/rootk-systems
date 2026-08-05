"use client";

import { motion, useReducedMotion } from "framer-motion";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { EmployeeLeaveSummary } from "@/components/employees/profile-data";
import type { TranslationPath } from "@/i18n";

export function EmployeeLeaveSummaryPanel({
  summary,
}: {
  summary: EmployeeLeaveSummary;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const stats = [
    { label: t("employees.leaveRemaining"), value: summary.remaining },
    { label: t("employees.leaveApproved"), value: summary.approved },
    { label: t("employees.leavePending"), value: summary.pending },
  ];

  return (
    <div className="space-y-3">
      <motion.div
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-2.5 sm:grid-cols-3"
      >
        {stats.map((item) => (
          <motion.div
            key={item.label}
            variants={fadeInUp}
            className="rounded-xl border border-border bg-muted/30 px-3.5 py-3"
          >
            <p className="section-label">{item.label}</p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums">{item.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold tracking-tight">
          {t("employees.recentLeave")}
        </p>
        {summary.recent.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {t(item.typeKey as TranslationPath)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {item.startDate}
                {item.endDate !== item.startDate ? ` – ${item.endDate}` : ""} ·{" "}
                {t("leave.daysCount", { count: item.days })}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
