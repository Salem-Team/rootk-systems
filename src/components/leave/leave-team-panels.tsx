"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CalendarRange, Users } from "lucide-react";
import { SoftListRow } from "@/components/shared/meta-chip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buildLeaveWorkflowMock } from "@/components/portal/portal-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

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
