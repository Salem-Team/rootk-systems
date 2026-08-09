"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Clock3 } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { SoftListRow } from "@/components/shared/meta-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildAttendanceMonthCells } from "@/components/portal/portal-mock-data";
import { useEmployeeProfileExtras } from "@/hooks/use-employee-profile-extras";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Employee, LeaveRequest } from "@/types";

const LEVEL = {
  0: "bg-muted",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary",
} as const;

export function PortalAttendancePanel({
  employee,
}: {
  employee: Employee;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const extras = useEmployeeProfileExtras(employee);
  const cells = useMemo(
    () => buildAttendanceMonthCells(employee.id.length),
    [employee.id]
  );

  if (!extras) return null;

  const stats = [
    {
      label: t("portal.attendanceScore"),
      value: extras.attendance.attendanceRate,
      suffix: "%",
    },
    {
      label: t("portal.workingHours"),
      value: extras.attendance.workingHours,
      suffix: "h",
    },
    {
      label: t("portal.lateStats"),
      value: extras.attendance.lateDays,
      suffix: "",
    },
    {
      label: t("portal.presentDays"),
      value: extras.attendance.presentDays,
      suffix: "",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">
            {t("portal.liveAttendanceTitle")}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("portal.liveAttendanceDesc")}
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/attendance">{t("portal.openAttendance")}</Link>
        </Button>
      </div>

      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4"
      >
        {stats.map((s) => (
          <motion.li key={s.label} variants={fadeInUp} className="kpi-tile surface-shine p-4">
            <p className="section-label !mb-0">{s.label}</p>
            <p className="stat-value mt-2 text-[1.45rem]">
              <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.suffix === "%" ? 1 : 0} />
            </p>
          </motion.li>
        ))}
      </motion.ul>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("portal.attendanceCalendar")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("portal.attendanceCalendarDesc")}
          </p>
        </div>
        <div className="panel-body">
          <div
            className="grid grid-cols-7 gap-1 sm:gap-1.5"
            role="img"
            aria-label={t("portal.attendanceCalendar")}
          >
            {cells.map((cell) => (
              <motion.div
                key={cell.day}
                whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg text-[10px] font-medium tabular-nums text-foreground/80",
                  LEVEL[cell.level]
                )}
                title={`${cell.day}`}
              >
                {cell.day}
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("portal.avgArrival", { time: extras.attendance.averageArrival })}
          </p>
        </div>
      </section>
    </div>
  );
}

export function PortalLeavePanel({
  leaves,
  employee,
}: {
  leaves: LeaveRequest[];
  employee: Employee;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const extras = useEmployeeProfileExtras(employee);
  if (!extras) return null;
  const remaining = extras.leave.remaining;
  const usedPct = Math.min(100, Math.round(((21 - remaining) / 21) * 100));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface-panel p-4 lg:col-span-1">
          <p className="section-label">{t("portal.leaveBalance")}</p>
          <p className="stat-value mt-2 text-[1.8rem]">
            <AnimatedCounter value={remaining} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("portal.leaveBalanceHint")}
          </p>
          <Progress value={100 - usedPct} className="mt-3 h-1.5" />
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border/60 px-2.5 py-2">
              <dt className="text-muted-foreground">{t("common.approved")}</dt>
              <dd className="font-semibold tabular-nums">{extras.leave.approved}</dd>
            </div>
            <div className="rounded-lg border border-border/60 px-2.5 py-2">
              <dt className="text-muted-foreground">{t("common.pending")}</dt>
              <dd className="font-semibold tabular-nums">{extras.leave.pending}</dd>
            </div>
          </dl>
        </section>

        <section className="surface-panel overflow-hidden lg:col-span-2">
          <div className="panel-header flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[0.95rem] font-semibold">
                {t("portal.leaveHistory")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("portal.leaveHistoryDesc")}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/leave">{t("leave.myRequests")}</Link>
            </Button>
          </div>
          <ul className="panel-body space-y-2">
            {leaves.length === 0 ? (
              <li className="text-sm text-muted-foreground">{t("leave.empty")}</li>
            ) : (
              leaves.slice(0, 6).map((leave) => (
                <li key={leave.id}>
                  <SoftListRow className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {t(`leaveTypes.${leave.type}`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leave.startDate}
                        {leave.endDate !== leave.startDate
                          ? ` – ${leave.endDate}`
                          : ""}{" "}
                        · {t("leave.daysCount", { count: leave.days })}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} />
                  </SoftListRow>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <motion.ol
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="relative space-y-0 surface-panel p-4"
      >
        <h3 className="mb-3 text-sm font-semibold">{t("portal.leaveTimeline")}</h3>
        <div className="absolute bottom-4 start-[27px] top-12 w-px bg-border" aria-hidden />
        {leaves.slice(0, 4).map((leave) => (
          <motion.li
            key={leave.id}
            variants={fadeInUp}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            <span className="relative z-10 mt-1 flex h-8 w-8 items-center justify-center rounded-lg border bg-card">
              <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border/60 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {t(`leaveTypes.${leave.type}`)}
                </p>
                <StatusBadge status={leave.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(new Date(leave.submittedAt), "MMM d · h:mm a", {
                  locale: dateLocale,
                })}
              </p>
            </div>
          </motion.li>
        ))}
        {leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("leave.empty")}</p>
        ) : null}
      </motion.ol>
    </div>
  );
}

