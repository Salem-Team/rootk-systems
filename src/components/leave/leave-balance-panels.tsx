"use client";

import { AnimatedCounter } from "@/components/shared/animated-counter";
import { MetaChip } from "@/components/shared/meta-chip";
import { Progress } from "@/components/ui/progress";
import { LeaveTimeline } from "@/components/leave/leave-timeline";
import { DepartmentLeaveCalendar, LeaveConflictIndicators, LeaveCoverageOverview } from "@/components/leave/leave-team-panels";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee, LeaveRequest } from "@/types";

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

export function LeaveWorkflowSidebar({
  canManage,
  requests,
  employees,
  balance,
}: {
  canManage: boolean;
  requests: LeaveRequest[];
  employees: Employee[];
  balance: { remaining: number; used: number; pending: number };
}) {
  return (
    <div className="space-y-4">
      <LeaveBalanceVisualization {...balance} />
      {!canManage ? (
        <LeaveApprovalTimeline requests={requests} employees={employees} />
      ) : null}
      {canManage ? (
        <>
          <DepartmentLeaveCalendar />
          <LeaveCoverageOverview />
          <LeaveConflictIndicators />
        </>
      ) : null}
    </div>
  );
}
