"use client";

import { AlertTriangle, Baby, ClipboardCheck, UserPlus, Users } from "lucide-react";
import { OpsWidget } from "@/components/operations/ops-widget";
import { deriveHrOps } from "@/components/operations/operations-mock-data";
import { buildBirthdays } from "@/components/dashboard/dashboard-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import type { DashboardStats, Employee, LeaveRequest } from "@/types";

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
