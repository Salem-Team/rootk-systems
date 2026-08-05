"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { buildDeptAnalytics } from "@/components/reports/analytics-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function DepartmentAnalyticsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const rows = buildDeptAnalytics();
  const top = rows.slice(0, 3);
  const low = [...rows].sort((a, b) => a.attendance - b.attendance).slice(0, 3);

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
            name: t(`departments.${r.department}`),
            value: `${r.attendance}%`,
          }))}
        />
        <RankList
          title={t("analytics.lowestDepartments")}
          items={low.map((r) => ({
            name: t(`departments.${r.department}`),
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
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">{title}</h3>
      </div>
      <ol className="panel-body space-y-2">
        {items.map((item, i) => (
          <li
            key={item.name}
            className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-semibold tabular-nums">
                {i + 1}
              </span>
              {item.name}
            </span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
