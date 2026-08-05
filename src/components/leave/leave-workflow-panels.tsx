"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Users,
} from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { MetaChip, SoftListRow } from "@/components/shared/meta-chip";
import { StatChip } from "@/components/shared/stat-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { StaggerItem, StaggerList, StaggerListItem, StaggerRoot } from "@/components/shared/stagger";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LeaveCard } from "@/components/leave/leave-card";
import { LeaveTimeline } from "@/components/leave/leave-timeline";
import { buildLeaveWorkflowMock } from "@/components/portal/portal-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { todayKey } from "@/lib/mock-date";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Employee, LeaveRequest } from "@/types";
import type { TranslationPath } from "@/i18n";

export function LeaveBalanceVisualization({
  remaining,
  used,
  pending,
}: {
  remaining: number;
  used: number;
  pending: number;
}) {
  const { t } = useTranslation();
  const total = Math.max(remaining + used, 1);
  const remainingPct = Math.round((remaining / total) * 100);

  return (
    <section className="surface-panel p-4" aria-labelledby="leave-balance-viz">
      <h3
        id="leave-balance-viz"
        className="font-display text-[0.95rem] font-semibold tracking-tight"
      >
        {t("leaveWorkflow.balanceTitle")}
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t("leaveWorkflow.balanceDesc")}
      </p>
      <p className="stat-value mt-3 text-[1.75rem]">
        <AnimatedCounter value={remaining} />
        <span className="ms-1 text-sm font-medium text-muted-foreground">
          {t("employeeHome.days")}
        </span>
      </p>
      <Progress value={remainingPct} className="mt-3 h-2" />
      <dl className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
        <MetaChip label={t("leaveWorkflow.remaining")} value={remaining} />
        <MetaChip label={t("leaveWorkflow.used")} value={used} />
        <MetaChip label={t("common.pending")} value={pending} />
      </dl>
    </section>
  );
}

export function LeaveApprovalTimeline({
  requests,
  employees,
}: {
  requests: LeaveRequest[];
  employees: Employee[];
}) {
  const { t } = useTranslation();
  return (
    <LeaveTimeline
      requests={requests.slice(0, 6)}
      employees={employees}
      title={t("leaveWorkflow.approvalTimeline")}
      description={t("leaveWorkflow.approvalTimelineDesc")}
    />
  );
}

export function TeamAvailabilityPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const mock = buildLeaveWorkflowMock();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("leaveWorkflow.teamAvailability")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("leaveWorkflow.teamAvailabilityDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-2"
      >
        {mock.teamAvailability.map((row) => (
          <motion.li key={row.name} variants={fadeInUp}>
            <SoftListRow className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.dept}</p>
              </div>
              <Badge
                variant={
                  row.status === "available"
                    ? "success"
                    : row.status === "leave"
                      ? "warning"
                      : "info"
                }
              >
                {t(`leaveWorkflow.status.${row.status}` as TranslationPath)}
              </Badge>
            </SoftListRow>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

export function DepartmentLeaveCalendar() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const mock = buildLeaveWorkflowMock();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <CalendarRange className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("leaveWorkflow.deptCalendar")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("leaveWorkflow.deptCalendarDesc")}
        </p>
      </div>
      <div className="panel-body">
        <div
          className="grid grid-cols-7 gap-1 sm:gap-1.5"
          role="img"
          aria-label={t("leaveWorkflow.deptCalendar")}
        >
          {mock.deptCalendar.map((cell) => (
            <motion.div
              key={cell.day}
              whileHover={reduceMotion ? undefined : { scale: 1.05 }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-[10px] font-medium tabular-nums",
                cell.count === 0 && "bg-muted text-muted-foreground",
                cell.count === 1 && "bg-primary/20",
                cell.count === 2 && "bg-primary/35",
                cell.count === 3 && "bg-amber-500/35",
                cell.count >= 4 && "bg-rose-500/40"
              )}
              title={t("leaveWorkflow.onLeaveCount", { count: cell.count })}
            >
              {cell.day}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LeaveConflictIndicators() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const mock = buildLeaveWorkflowMock();

  const tone = {
    low: "border-sky-500/20 bg-sky-500/[0.06]",
    med: "border-amber-500/20 bg-amber-500/[0.06]",
    high: "border-rose-500/20 bg-rose-500/[0.06]",
  } as const;

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
          {t("leaveWorkflow.conflicts")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("leaveWorkflow.conflictsDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-2"
      >
        {mock.conflicts.map((c) => (
          <motion.li
            key={c.id}
            variants={fadeInUp}
            className={cn("rounded-xl border px-3 py-2.5 text-sm", tone[c.severity])}
          >
            <span className="font-medium capitalize">
              {t(`leaveWorkflow.severity.${c.severity}` as TranslationPath)}
            </span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="text-muted-foreground">{c.label}</span>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

export function LeaveCoverageOverview() {
  const { t } = useTranslation();
  const mock = buildLeaveWorkflowMock();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">
          {t("leaveWorkflow.coverage")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("leaveWorkflow.coverageDesc")}
        </p>
      </div>
      <ul className="panel-body space-y-3">
        {mock.coverage.map((row) => {
          const pct = Math.round((row.onLeave / row.capacity) * 100);
          return (
            <li key={row.day}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{row.day}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.onLeave}/{row.capacity}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function LeaveStatsStrip({
  requests,
  compact = false,
}: {
  requests: LeaveRequest[];
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const today = todayKey();
    const upcoming = requests.filter(
      (r) => r.status === "approved" && r.startDate >= today
    ).length;
    const all = [
      { label: t("common.pending"), value: pending },
      { label: t("common.approved"), value: approved },
      { label: t("common.rejected"), value: rejected },
      { label: t("leaveWorkflow.upcoming"), value: upcoming },
    ];
    return compact ? all.slice(0, 2) : all;
  }, [requests, t, compact]);

  return (
    <StaggerList
      speed="fast"
      className={
        compact
          ? "grid grid-cols-2 gap-2.5"
          : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      }
    >
      {stats.map((s) => (
        <StaggerListItem key={s.label}>
          <StatChip label={s.label} value={s.value} compact={compact} />
        </StaggerListItem>
      ))}
    </StaggerList>
  );
}

export function AdminLeaveReviewPanel({
  pending,
  employees,
  onUpdated,
}: {
  pending: LeaveRequest[];
  employees: Map<string, Employee>;
  onUpdated: (r: LeaveRequest) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const mock = buildLeaveWorkflowMock();

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold">
              {t("leaveWorkflow.pendingApprovals")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("leaveWorkflow.pendingApprovalsDesc")}
            </p>
          </div>
          <div className="panel-body space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("leave.emptyPending")}
              </p>
            ) : (
              <StaggerRoot speed="fast" className="space-y-3">
                {pending.slice(0, 4).map((request) => (
                  <StaggerItem key={request.id} preset="rise">
                    <LeaveCard
                      request={request}
                      employee={employees.get(request.employeeId)}
                      showActions
                      onUpdated={onUpdated}
                    />
                  </StaggerItem>
                ))}
              </StaggerRoot>
            )}
          </div>
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              {t("leaveWorkflow.recentApprovals")}
            </h3>
          </div>
          <motion.ul
            variants={staggerContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="panel-body space-y-2"
          >
            {mock.recentApprovals.map((row) => (
              <motion.li key={row.id} variants={fadeInUp}>
                <SoftListRow className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`leaveTypes.${row.type}` as TranslationPath)} · {row.at}
                    </p>
                  </div>
                  <StatusBadge status={row.result} />
                </SoftListRow>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamAvailabilityPanel />
        <LeaveConflictIndicators />
      </div>
    </div>
  );
}

export function LeaveWorkflowSidebar({
  isAdmin,
  requests,
  employees,
  balance,
}: {
  isAdmin: boolean;
  requests: LeaveRequest[];
  employees: Employee[];
  balance: { remaining: number; used: number; pending: number };
}) {
  return (
    <div className="space-y-4">
      <LeaveBalanceVisualization {...balance} />
      {!isAdmin ? (
        <LeaveApprovalTimeline requests={requests} employees={employees} />
      ) : null}
      {isAdmin ? (
        <>
          <DepartmentLeaveCalendar />
          <LeaveCoverageOverview />
          <LeaveConflictIndicators />
        </>
      ) : null}
    </div>
  );
}
