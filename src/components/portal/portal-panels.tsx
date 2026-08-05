"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  CalendarDays,
  Clock3,
  FileText,
  GraduationCap,
  Megaphone,
  Plane,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { SoftListRow } from "@/components/shared/meta-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ManagerCard,
  MyTeamCard,
} from "@/components/dashboard/manager-team-panel";
import {
  buildAttendanceMonthCells,
  buildPortalAchievements,
  buildPortalDocuments,
  buildPortalEvents,
  buildPortalRequests,
  buildPortalTimeline,
} from "@/components/portal/portal-mock-data";
import { useEmployeeProfileExtras } from "@/hooks/use-employee-profile-extras";
import { useNotifications } from "@/hooks/use-notifications";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Employee, LeaveRequest } from "@/types";
import type { TranslationPath } from "@/i18n";

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
            className="grid grid-cols-7 gap-1.5 sm:gap-2"
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
                {format(new Date(leave.submittedAt), "MMM d · HH:mm", {
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

export function PortalRequestsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const requests = buildPortalRequests();

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-3 sm:grid-cols-2"
    >
      {requests.map((req) => (
        <motion.li
          key={req.id}
          variants={fadeInUp}
          className="surface-panel surface-panel-interactive p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t(req.titleKey)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{req.detail}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("portal.submittedOn", { date: req.submitted })}
              </p>
            </div>
            <StatusBadge status={req.status} />
          </div>
          <Badge variant="outline" className="mt-3 capitalize">
            {t(`portal.kind.${req.kind}` as TranslationPath)}
          </Badge>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function PortalDocumentsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const docs = buildPortalDocuments();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("portal.documentsDesc")}</p>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {docs.map((doc) => (
          <motion.li key={doc.id} variants={fadeInUp}>
            <button
              type="button"
              onClick={() => toast.message(t("portal.docUiOnly"))}
              className="surface-panel surface-panel-interactive flex w-full flex-col items-start gap-3 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="icon-well">
                <FileText className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{t(doc.titleKey)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(doc.categoryKey)} · {doc.updated} · {doc.size}
                </p>
              </div>
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export function PortalNotificationsPanel() {
  const { locale } = useTranslation();
  const userId = useSessionStore((s) => s.user.id);
  const { items, loading, markRead, markAllRead } = useNotifications();

  return (
    <div className="surface-panel overflow-hidden">
      <NotificationFeed
        items={items}
        userId={userId}
        locale={locale}
        loading={loading}
        maxHeight="min(420px, 60vh)"
        onRead={(id) => void markRead(id)}
        onMarkAll={() => void markAllRead()}
      />
    </div>
  );
}

export function PortalTeamPanel({
  manager,
  teammates,
}: {
  manager: Employee | null;
  teammates: Employee[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MyTeamCard teammates={teammates} />
      <ManagerCard manager={manager} />
    </div>
  );
}

export function PortalManagerPanel({ manager }: { manager: Employee | null }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <ManagerCard manager={manager} />
      <section className="surface-panel p-4">
        <h3 className="text-sm font-semibold">{t("portal.managerNotes")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("portal.managerNotesBody")}
        </p>
      </section>
    </div>
  );
}

export function PortalTimelinePanel() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const items = buildPortalTimeline();

  const icons = {
    attendance: Timer,
    leave: Plane,
    announcement: Megaphone,
    document: FileText,
    training: GraduationCap,
  } as const;

  return (
    <motion.ol
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative space-y-0"
    >
      <div
        className="absolute bottom-2 start-[19px] top-2 w-px bg-border"
        aria-hidden
      />
      {items.map((item) => {
        const Icon = icons[item.category];
        return (
          <motion.li
            key={item.id}
            variants={fadeInUp}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            <span className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
              <p className="text-sm font-semibold">{t(item.titleKey)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(item.bodyKey)}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {format(new Date(item.at), "MMM d, yyyy · HH:mm", {
                  locale: dateLocale,
                })}
              </p>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

export function PortalEventsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const events = buildPortalEvents();

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-3 sm:grid-cols-3"
    >
      {events.map((ev) => (
        <motion.li
          key={ev.id}
          variants={fadeInUp}
          className="surface-panel surface-panel-interactive p-4"
        >
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          <p className="mt-3 text-sm font-semibold">{t(ev.titleKey)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ev.date} · {t(ev.placeKey)}
          </p>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function PortalAchievementsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const items = buildPortalAchievements();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("portal.achievementsDesc")}</p>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-3"
      >
        {items.map((a) => (
          <motion.li
            key={a.id}
            variants={fadeInUp}
            className="surface-panel surface-panel-interactive surface-shine p-4"
          >
            <Badge variant="info">{a.earned}</Badge>
            <p className="mt-3 text-sm font-semibold">{t(a.titleKey)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(a.bodyKey)}</p>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export function PortalStatsPanel({ employee }: { employee: Employee }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const extras = useEmployeeProfileExtras(employee);
  if (!extras) return null;

  const rows = [
    {
      label: t("portal.statAttendanceRate"),
      value: `${extras.attendance.attendanceRate}%`,
      progress: extras.attendance.attendanceRate,
    },
    {
      label: t("portal.statHours"),
      value: `${extras.attendance.workingHours}h`,
      progress: Math.min(100, extras.attendance.workingHours / 1.8),
    },
    {
      label: t("portal.statLeaveHealth"),
      value: `${extras.leave.remaining} ${t("employeeHome.days")}`,
      progress: Math.min(100, extras.leave.remaining * 4),
    },
    {
      label: t("portal.statPerformance"),
      value: extras.performance.score.toFixed(1),
      progress: extras.performance.score * 20,
    },
  ];

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-3 sm:grid-cols-2"
    >
      {rows.map((row) => (
        <motion.li key={row.label} variants={fadeInUp} className="surface-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{row.label}</p>
            <p className="font-semibold tabular-nums">{row.value}</p>
          </div>
          <Progress value={row.progress} className="mt-3 h-1.5" />
        </motion.li>
      ))}
    </motion.ul>
  );
}
