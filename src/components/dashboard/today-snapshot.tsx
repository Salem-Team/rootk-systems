"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { DashboardStats } from "@/types";

export function TodaySnapshot({ stats }: { stats: DashboardStats }) {
  const { t } = useTranslation();

  const segments: {
    key: string;
    labelKey: TranslationPath;
    value: number;
    color: string;
  }[] = [
    {
      key: "present",
      labelKey: "dashboard.present",
      value: stats.present,
      color: "bg-emerald-600",
    },
    {
      key: "late",
      labelKey: "dashboard.late",
      value: stats.late,
      color: "bg-amber-500",
    },
    {
      key: "wfh",
      labelKey: "status.wfh",
      value: stats.wfh,
      color: "bg-sky-600",
    },
    {
      key: "absent",
      labelKey: "dashboard.absent",
      value: stats.absent,
      color: "bg-rose-500",
    },
    {
      key: "onLeave",
      labelKey: "status.on_leave",
      value: stats.onLeave,
      color: "bg-slate-500",
    },
  ];
  const total = Math.max(
    segments.reduce((sum, s) => sum + s.value, 0),
    1
  );

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold tracking-tight">
          {t("dashboard.todayAttendance")}
        </h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {t("dashboard.todayComposition")}
        </p>
      </div>
      <div className="panel-body space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-label">{t("dashboard.rateLabel")}</p>
            <p className="mt-1 text-[2.25rem] font-semibold tracking-tight tabular-nums">
              <AnimatedCounter value={stats.attendanceRate} decimals={1} suffix="%" />
            </p>
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/[0.05] px-3.5 py-2 text-[13px] font-semibold text-primary">
            {stats.present + stats.late + stats.wfh} / {stats.totalEmployees}{" "}
            {t("dashboard.inOffice")}
          </div>
        </div>
        <Progress value={stats.attendanceRate} className="h-1.5 overflow-hidden" />
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/80">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.key}
              initial={{ width: 0, opacity: 0.4 }}
              animate={{
                width: `${(segment.value / total) * 100}%`,
                opacity: 1,
              }}
              transition={{
                duration: 0.7,
                delay: index * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={segment.color}
              title={`${t(segment.labelKey)}: ${segment.value}`}
            />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {segments.map((segment, index) => (
            <motion.li
              key={segment.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.08 + index * 0.04,
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="kpi-tile px-2.5 py-2.5"
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${segment.color}`} />
                <span className="text-[10px] text-muted-foreground">
                  {t(segment.labelKey)}
                </span>
              </div>
              <p className="stat-value text-base">
                <AnimatedCounter value={segment.value} />
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
