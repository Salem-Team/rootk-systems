"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Gauge,
  Target,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TableSkeleton } from "@/components/shared/loading-state";
import { StaggerItem, StaggerList } from "@/components/shared/stagger";
import { getEmployeeTargetPerformance } from "@/services/targets.service";
import { getWorkTasks } from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import { taskDueBucket } from "@/lib/work-utils";
import type { Employee } from "@/types";
import type {
  EmployeeTargetPerformance,
  PerformanceTarget,
  TargetCategory,
} from "@/types/targets";
import type { WorkTask } from "@/types/work";
import { initials } from "./performance-report-utils";
import { EmployeeTargetBreakdown } from "./employee-target-breakdown";
import { SummaryTile } from "./performance-summary-tile";

export function EmployeeFullReport({
  employeeId,
  categories,
  employees,
  categoryId,
  onBack,
  onView,
  onEdit,
}: {
  employeeId: string;
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  categoryId?: string;
  onBack: () => void;
  onView?: (target: PerformanceTarget) => void;
  onEdit?: (target: PerformanceTarget) => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const employee = employees.get(employeeId);
  const [performance, setPerformance] =
    useState<EmployeeTargetPerformance | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [perfRes, tasksRes] = await Promise.all([
      getEmployeeTargetPerformance(employeeId),
      getWorkTasks({ employeeId }),
    ]);
    if (perfRes.success) setPerformance(perfRes.data);
    if (tasksRes.success) setTasks(tasksRes.data);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const personTargets = useMemo(() => {
    if (!performance) return [] as PerformanceTarget[];
    if (!categoryId) return performance.targets;
    return performance.targets.filter((x) => x.categoryId === categoryId);
  }, [performance, categoryId]);

  const targetIds = useMemo(
    () => new Set(personTargets.map((x) => x.id)),
    [personTargets]
  );

  const linkedTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.targetId && targetIds.has(task.targetId)
      ),
    [tasks, targetIds]
  );

  const tasksByTarget = useMemo(() => {
    const map = new Map<string, WorkTask[]>();
    for (const task of linkedTasks) {
      const id = task.targetId!;
      map.set(id, [...(map.get(id) ?? []), task]);
    }
    return map;
  }, [linkedTasks]);

  const taskStats = useMemo(() => {
    const completed = linkedTasks.filter((x) => x.status === "completed").length;
    const open = linkedTasks.filter((x) => x.status !== "completed").length;
    const overdue = linkedTasks.filter(
      (x) => taskDueBucket(x.dueDate, x.status) === "overdue"
    ).length;
    const rate =
      linkedTasks.length === 0
        ? 0
        : Math.round((completed / linkedTasks.length) * 1000) / 10;
    return { completed, open, overdue, rate, total: linkedTasks.length };
  }, [linkedTasks]);

  if (loading || !performance) return <TableSkeleton rows={6} />;

  const currentTargetsCount = categoryId
    ? personTargets.filter(
        (x) => x.status !== "completed" && x.status !== "cancelled"
      ).length
    : performance.currentTargets;
  const completedCount = categoryId
    ? personTargets.filter((x) => x.status === "completed").length
    : performance.completed;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="surface-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="lg:hidden"
              onClick={onBack}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("targets.report.backToRoster")}
            </Button>
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {initials(employee?.name ?? employeeId)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate text-[1.1rem] font-semibold tracking-tight sm:text-[1.2rem]">
                {employee?.name ?? employeeId}
              </h3>
              <p className="truncate text-[13px] text-muted-foreground">
                {[employee?.department, employee?.position]
                  .filter(Boolean)
                  .join(" · ") || t("targets.report.noDepartment")}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="h-8 px-3 font-mono text-[13px] tabular-nums"
          >
            {t("targets.employeePerf.overallScore")}: {performance.overallScore}
          </Badge>
        </div>
      </section>

      <StaggerList
        speed="fast"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5"
      >
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.employeePerf.overallScore")}
            value={performance.overallScore}
            icon={Gauge}
            decimals={1}
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.employeePerf.currentTargets")}
            value={currentTargetsCount}
            icon={Target}
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.kpi.completed")}
            value={completedCount}
            icon={CheckCircle2}
            tone="text-emerald-700 dark:text-emerald-400"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.report.taskCompletion")}
            value={taskStats.rate}
            icon={TrendingUp}
            suffix="%"
            decimals={1}
            tone="text-teal-800 dark:text-teal-300"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.report.linkedTasks")}
            value={taskStats.total}
            icon={ClipboardList}
            tone="text-sky-700 dark:text-sky-400"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.employeePerf.delayedTasks")}
            value={taskStats.overdue}
            icon={TimerReset}
            tone="text-rose-700 dark:text-rose-400"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
      </StaggerList>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h4 className="text-[0.95rem] font-semibold tracking-tight">
            {t("targets.report.taskSummary")}
          </h4>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("targets.report.taskSummaryDesc")}
          </p>
        </div>
        <div className="panel-body grid gap-3 sm:grid-cols-3 sm:gap-3.5">
          <SummaryTile
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            label={t("targets.report.tasksDone")}
            value={taskStats.completed}
            tone="bg-emerald-500/10"
          />
          <SummaryTile
            icon={<CircleDashed className="h-5 w-5 text-sky-600" />}
            label={t("targets.report.tasksOpen")}
            value={taskStats.open}
            tone="bg-sky-500/10"
          />
          <SummaryTile
            icon={<TimerReset className="h-5 w-5 text-rose-600" />}
            label={t("ops.due.overdue")}
            value={taskStats.overdue}
            tone="bg-rose-500/10"
          />
        </div>
      </section>

      <EmployeeTargetBreakdown
        personTargets={personTargets}
        categories={categories}
        tasksByTarget={tasksByTarget}
        dateLocale={dateLocale}
        onView={onView}
        onEdit={onEdit}
      />
    </div>
  );
}
