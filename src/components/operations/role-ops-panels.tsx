"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Baby,
  ClipboardCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OpsWidget } from "@/components/operations/ops-widget";
import {
  buildOpsAlerts,
  deriveHrOps,
  deriveManagerOps,
} from "@/components/operations/operations-mock-data";
import {
  buildBirthdays,
  buildDepartmentStats,
} from "@/components/dashboard/dashboard-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { departmentLabel } from "@/lib/department-label";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { LateDurationBadge } from "@/components/shared/late-duration-badge";
import type {
  AttendanceRecord,
  DashboardStats,
  Employee,
  LeaveRequest,
} from "@/types";
import type { TranslationPath } from "@/i18n";

export function ManagerOpsPanel({
  employees,
  attendance,
  leaves,
}: {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
}) {
  const { t } = useTranslation();
  const data = deriveManagerOps(employees, attendance, leaves);
  const dept = buildDepartmentStats(employees, attendance).slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <OpsWidget
        id="mgr-approvals"
        title={t("ops.mgrApprovals")}
        description={t("ops.mgrApprovalsDesc")}
        actions={
          <Button asChild size="sm" variant="outline" className="h-7">
            <Link href="/leave">{t("leave.pendingTab")}</Link>
          </Button>
        }
      >
        <motion.ul
          variants={staggerContainer}
          initial={false}
          animate="visible"
          className="space-y-2"
        >
          {data.pending.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              {t("leave.emptyPending")}
            </li>
          ) : (
            data.pending.map((row) => (
              <motion.li
                key={row.id}
                variants={fadeInUp}
                className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`leaveTypes.${row.type}` as TranslationPath)} ·{" "}
                    {t("leave.daysCount", { count: row.days })}
                  </p>
                </div>
                <Badge variant="warning">{t("common.pending")}</Badge>
              </motion.li>
            ))
          )}
        </motion.ul>
      </OpsWidget>

      <OpsWidget id="mgr-late" title={t("ops.mgrLate")} description={t("ops.mgrLateDesc")}>
        <PeopleList
          items={data.late.map((r) => ({
            id: r.id,
            name: r.name,
            meta: r.minutes ? (
              <LateDurationBadge minutes={r.minutes} size="sm" />
            ) : (
              "—"
            ),
          }))}
          empty={t("ops.noneLate")}
        />
      </OpsWidget>

      <OpsWidget
        id="mgr-absent"
        title={t("ops.mgrAbsent")}
        description={t("ops.mgrAbsentDesc")}
      >
        <PeopleList
          items={data.absent.map((r) => ({ id: r.id, name: r.name, meta: "" }))}
          empty={t("ops.noneAbsent")}
        />
      </OpsWidget>

      <OpsWidget
        id="mgr-leave"
        title={t("ops.mgrOnLeave")}
        description={t("ops.mgrOnLeaveDesc")}
      >
        <PeopleList
          items={data.onLeave.map((r) => ({ id: r.id, name: r.name, meta: "" }))}
          empty={t("ops.noneOnLeave")}
        />
      </OpsWidget>

      <OpsWidget
        id="mgr-dept"
        title={t("ops.mgrDeptAtt")}
        description={t("ops.mgrDeptAttDesc")}
        className="lg:col-span-2"
      >
        <ul className="space-y-3">
          {dept.map((d) => (
            <li key={d.department}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {departmentLabel(d.department, t)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {d.rate}%
                </span>
              </div>
              <Progress value={d.rate} className="h-1.5" />
            </li>
          ))}
        </ul>
      </OpsWidget>
    </div>
  );
}

function PeopleList({
  items,
  empty,
}: {
  items: { id: string; name: string; meta: ReactNode }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
        >
          <span className="text-sm font-medium">{row.name}</span>
          {row.meta ? (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {row.meta}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function HrOpsPanel({
  employees,
  leaves,
  stats,
}: {
  employees: Employee[];
  leaves: LeaveRequest[];
  stats: DashboardStats;
}) {
  const { t } = useTranslation();
  const hr = deriveHrOps(employees, leaves);
  const birthdays = buildBirthdays(employees).slice(0, 4);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label={t("ops.hrPresent")}
        value={String(stats.present)}
        icon={Users}
      />
      <StatTile
        label={t("ops.hrPendingLeave")}
        value={String(hr.pendingLeave)}
        icon={ClipboardCheck}
      />
      <StatTile
        label={t("ops.hrCorrections")}
        value={String(hr.pendingCorrections)}
        icon={AlertTriangle}
      />
      <StatTile
        label={t("ops.hrProbation")}
        value={String(hr.probationReviews)}
        icon={Baby}
      />

      <OpsWidget
        id="hr-new"
        title={t("ops.hrNewEmployees")}
        description={t("ops.hrNewEmployeesDesc")}
        className="sm:col-span-2"
      >
        <ul className="space-y-2">
          {hr.newHires.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <UserPlus className="h-3.5 w-3.5 text-primary" aria-hidden />
                {e.name}
              </span>
              <span className="text-xs text-muted-foreground">{e.joinDate}</span>
            </li>
          ))}
        </ul>
      </OpsWidget>

      <OpsWidget
        id="hr-bday"
        title={t("ops.hrBirthdays")}
        description={t("ops.hrBirthdaysDesc")}
        className="sm:col-span-2"
      >
        <ul className="space-y-2">
          {birthdays.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <span className="font-medium">{b.name}</span>
              <span className="text-xs text-muted-foreground">{b.dateLabel}</span>
            </li>
          ))}
        </ul>
      </OpsWidget>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="surface-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label !mb-0">{label}</p>
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
      </div>
      <p className="stat-value mt-2 text-[1.45rem] tabular-nums">{value}</p>
    </div>
  );
}

export function AdminOpsPanel({
  stats,
  activitiesCount,
}: {
  stats: DashboardStats;
  activitiesCount: number;
}) {
  const { t } = useTranslation();
  const alerts = buildOpsAlerts();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <OpsWidget
        id="admin-pulse"
        title={t("ops.adminPulse")}
        description={t("ops.adminPulseDesc")}
      >
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <PulseStat label={t("dashboard.present")} value={stats.present} />
          <PulseStat label={t("dashboard.late")} value={stats.late} />
          <PulseStat label={t("dashboard.wfh")} value={stats.wfh} />
          <PulseStat label={t("dashboard.absent")} value={stats.absent} />
          <PulseStat
            label={t("dashboard.attendanceRate")}
            value={`${stats.attendanceRate}%`}
          />
          <PulseStat label={t("ops.liveEvents")} value={activitiesCount} />
        </dl>
      </OpsWidget>

      <OpsWidget
        id="admin-alerts"
        title={t("ops.adminAlerts")}
        description={t("ops.adminAlertsDesc")}
        className="lg:col-span-2"
      >
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                a.severity === "critical" &&
                  "border-rose-500/25 bg-rose-500/[0.06]",
                a.severity === "warn" &&
                  "border-amber-500/25 bg-amber-500/[0.06]",
                a.severity === "info" && "border-sky-500/25 bg-sky-500/[0.06]"
              )}
            >
              <p className="text-sm font-semibold">{t(a.titleKey)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(a.bodyKey)}
              </p>
            </li>
          ))}
        </ul>
      </OpsWidget>
    </div>
  );
}

function PulseStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border/60 px-2.5 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
