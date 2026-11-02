"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { DepartmentBadge } from "@/components/employees/department-badge";
import type { DeptAnalyticsRow } from "@/components/reports/analytics-mock-data";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { departmentLabel } from "@/lib/department-label";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function DepartmentAnalyticsPanel({
  rows,
}: {
  rows: DeptAnalyticsRow[];
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const top = rows.slice(0, 3);
  const low = [...rows].sort((a, b) => a.attendance - b.attendance).slice(0, 3);

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title={t("reports.emptyTitle")}
        description={t("analytics.sectionDepartmentsDesc")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {rows.slice(0, 8).map((row) => (
          <motion.li
            key={row.department}
            variants={fadeInUp}
            className="surface-panel surface-panel-interactive p-4"
          >
            <DepartmentBadge department={row.department} />
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Stat label={t("analytics.attPct")} value={`${row.attendance}%`} />
              <Stat label={t("analytics.latePct")} value={`${row.late}%`} />
              <Stat label={t("analytics.leavePct")} value={`${row.leave}%`} />
              <Stat
                label={t("analytics.productivity")}
                value={`${row.productivity}`}
              />
            </dl>
            <Progress value={row.attendance} className="mt-3 h-1.5" />
          </motion.li>
        ))}
      </motion.ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankList
          title={t("analytics.topDepartments")}
          items={top.map((r) => ({
            name: departmentLabel(r.department, t),
            value: `${r.attendance}%`,
          }))}
        />
        <RankList
          title={t("analytics.lowestDepartments")}
          items={low.map((r) => ({
            name: departmentLabel(r.department, t),
            value: `${r.attendance}%`,
          }))}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function RankList({
  title,
  items,
}: {
  title: string;
  items: { name: string; value: string }[];
}) {
  return (
    <div className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">{title}</h3>
      </div>
      <ul className="panel-body space-y-2">
        {items.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
          >
            <span className="min-w-0 truncate text-sm font-medium">
              <span className="me-2 text-muted-foreground">{index + 1}.</span>
              {item.name}
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
