"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { SoftListRow } from "@/components/shared/meta-chip";
import { StatChip } from "@/components/shared/stat-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { StaggerItem, StaggerList, StaggerListItem, StaggerRoot } from "@/components/shared/stagger";
import { LeaveCard } from "@/components/leave/leave-card";
import { LeaveConflictIndicators, TeamAvailabilityPanel } from "@/components/leave/leave-team-panels";
import { buildLeaveWorkflowMock } from "@/components/portal/portal-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { todayKey } from "@/lib/mock-date";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { Employee, LeaveRequest } from "@/types";
import type { TranslationPath } from "@/i18n";

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
