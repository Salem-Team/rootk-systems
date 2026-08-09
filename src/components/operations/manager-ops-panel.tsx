"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OpsWidget } from "@/components/operations/ops-widget";
import { deriveManagerOps } from "@/components/operations/operations-mock-data";
import { buildDepartmentStats } from "@/components/dashboard/dashboard-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { departmentLabel } from "@/lib/department-label";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { LateDurationBadge } from "@/components/shared/late-duration-badge";
import type { AttendanceRecord, Employee, LeaveRequest } from "@/types";
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
