"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Gauge,
  Search,
  Target,
  TimerReset,
  TrendingUp,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { StaggerItem, StaggerList } from "@/components/shared/stagger";
import {
  TargetPriorityBadge,
  TargetRiskBadge,
  TargetStatusBadge,
} from "@/components/targets/target-status-badge";
import {
  TargetProgressRing,
  type ProgressRingTone,
} from "@/components/targets/target-progress-ring";
import { getEmployeeTargetPerformance } from "@/services/targets.service";
import { getWorkTasks } from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import { taskDueBucket } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  EmployeeTargetPerformance,
  PerformanceTarget,
  TargetCategory,
} from "@/types/targets";
import type { WorkTask } from "@/types/work";

const RING_TONE: Record<PerformanceTarget["health"], ProgressRingTone> = {
  excellent: "success",
  good: "success",
  average: "primary",
  warning: "warning",
  critical: "danger",
  delayed: "danger",
};

interface RosterRow {
  employeeId: string;
  name: string;
  department: string;
  score: number;
  total: number;
  completed: number;
  open: number;
  delayed: number;
}

interface PerformanceReportPanelProps {
  targets: PerformanceTarget[];
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  categoryId?: string;
  onView?: (target: PerformanceTarget) => void;
  onEdit?: (target: PerformanceTarget) => void;
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function buildRoster(
  targets: PerformanceTarget[],
  employees: Map<string, Employee>
): RosterRow[] {
  const map = new Map<
    string,
    { scores: number[]; total: number; completed: number; open: number; delayed: number }
  >();

  for (const target of targets) {
    for (const id of target.assigneeIds) {
      const cur = map.get(id) ?? {
        scores: [],
        total: 0,
        completed: 0,
        open: 0,
        delayed: 0,
      };
      cur.scores.push(target.performanceScore);
      cur.total += 1;
      if (target.status === "completed") cur.completed += 1;
      else if (target.status !== "cancelled") cur.open += 1;
      if (target.status === "delayed" || target.riskLevel === "critical") {
        cur.delayed += 1;
      }
      map.set(id, cur);
    }
  }

  return [...map.entries()]
    .map(([employeeId, agg]) => {
      const emp = employees.get(employeeId);
      const score =
        agg.scores.length === 0
          ? 0
          : Math.round(
              (agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length) * 10
            ) / 10;
      return {
        employeeId,
        name: emp?.name ?? employeeId,
        department: emp?.department ?? "",
        score,
        total: agg.total,
        completed: agg.completed,
        open: agg.open,
        delayed: agg.delayed,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Admin performance report: roster of assignees + full target/task breakdown. */
export function PerformanceReportPanel({
  targets,
  categories,
  employees,
  categoryId,
  onView,
  onEdit,
  className,
}: PerformanceReportPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scopedTargets = useMemo(
    () =>
      categoryId
        ? targets.filter((x) => x.categoryId === categoryId)
        : targets,
    [targets, categoryId]
  );

  const roster = useMemo(
    () => buildRoster(scopedTargets, employees),
    [scopedTargets, employees]
  );

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q)
    );
  }, [roster, query]);

  useEffect(() => {
    if (selectedId && !roster.some((r) => r.employeeId === selectedId)) {
      setSelectedId(null);
    }
  }, [roster, selectedId]);

  if (roster.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("targets.report.empty")}
        description={t("targets.report.emptyDesc")}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight">
            <Gauge className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("targets.report.title")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("targets.report.description")}
          </p>
        </div>
        <div className="panel-body space-y-3">
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("targets.report.searchPeople")}
              className="h-11 rounded-xl ps-9"
            />
          </div>
          <p className="text-[12px] text-muted-foreground">
            {t("targets.report.peopleCount", { count: filteredRoster.length })}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:gap-5">
        <aside className="surface-panel overflow-hidden lg:sticky lg:top-20 lg:self-start">
          <div className="border-b border-border/60 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("targets.report.roster")}
            </p>
          </div>
          <ul className="max-h-[min(70vh,640px)] space-y-0.5 overflow-y-auto p-2.5">
            {filteredRoster.map((row, index) => {
              const active = selectedId === row.employeeId;
              return (
                <li key={row.employeeId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.employeeId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors",
                      active
                        ? "bg-primary/[0.08] text-primary"
                        : "hover:bg-muted/60"
                    )}
                    aria-pressed={active}
                  >
                    <span className="w-5 shrink-0 text-center font-mono text-[10px] text-muted-foreground">
                      {index + 1}
                    </span>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {row.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {row.department || t("targets.report.noDepartment")}
                        {" · "}
                        {row.completed}/{row.total}
                      </span>
                    </span>
                    <TargetProgressRing
                      percentage={row.score}
                      size={40}
                      strokeWidth={4}
                      tone={
                        row.score >= 80
                          ? "success"
                          : row.score >= 55
                            ? "primary"
                            : row.score >= 35
                              ? "warning"
                              : "danger"
                      }
                    />
                  </button>
                </li>
              );
            })}
            {filteredRoster.length === 0 ? (
              <li className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                {t("common.noResults")}
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="min-w-0">
          {selectedId ? (
            <EmployeeFullReport
              employeeId={selectedId}
              categories={categories}
              employees={employees}
              categoryId={categoryId}
              onBack={() => setSelectedId(null)}
              onView={onView}
              onEdit={onEdit}
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={t("targets.report.selectPerson")}
              description={t("targets.report.selectPersonDesc")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeFullReport({
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

      <section className="space-y-3">
        <h4 className="text-[0.95rem] font-semibold tracking-tight">
          {t("targets.report.targetsBreakdown")}
        </h4>
        {personTargets.length === 0 ? (
          <EmptyState
            compact
            icon={Target}
            title={t("targets.list.empty")}
            description={t("targets.report.noTargetsForPerson")}
          />
        ) : (
          <ul className="space-y-3.5">
            {personTargets.map((target) => {
              const category = categories.get(target.categoryId);
              const percentage = target.metrics?.percentage ?? 0;
              const linked = tasksByTarget.get(target.id) ?? [];
              const linkedDone = linked.filter(
                (x) => x.status === "completed"
              ).length;

              return (
                <li
                  key={target.id}
                  className="surface-panel overflow-hidden"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold leading-snug sm:text-base">
                          {target.title}
                        </p>
                        {category ? (
                          <Badge
                            variant="outline"
                            className="gap-1.5"
                            style={{ borderColor: `${category.color}55` }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <TargetStatusBadge status={target.status} />
                        <TargetPriorityBadge priority={target.priority} />
                        <TargetRiskBadge risk={target.riskLevel} />
                      </div>
                      <p className="text-[12px] text-muted-foreground sm:text-[13px]">
                        {target.completedQuantity}/{target.quantity}{" "}
                        {target.unit}
                        {" · "}
                        {t("targets.list.performance")}:{" "}
                        <span className="font-mono tabular-nums">
                          {target.performanceScore}
                        </span>
                        {" · "}
                        {format(parseISO(target.endDate), "d MMM yyyy", {
                          locale: dateLocale,
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <TargetProgressRing
                        percentage={percentage}
                        size={64}
                        tone={RING_TONE[target.health]}
                      />
                      {onView ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onView(target)}
                        >
                          {t("common.view")}
                        </Button>
                      ) : null}
                      {onEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(target)}
                        >
                          {t("common.edit")}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t border-border/60 bg-muted/20 px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-muted-foreground">
                        {t("targets.report.linkedTasksForTarget")}
                      </p>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {linkedDone}/{linked.length}
                      </span>
                    </div>
                    {linked.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground">
                        {t("targets.report.noLinkedTasks")}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {linked.map((task) => {
                          const due = taskDueBucket(task.dueDate, task.status);
                          return (
                            <li
                              key={task.id}
                              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2.5"
                            >
                              <span
                                className={cn(
                                  "h-2 w-2 shrink-0 rounded-full",
                                  task.status === "completed"
                                    ? "bg-emerald-500"
                                    : due === "overdue"
                                      ? "bg-rose-500"
                                      : task.status === "in_progress"
                                        ? "bg-sky-500"
                                        : "bg-muted-foreground/50"
                                )}
                              />
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                                {task.title}
                              </span>
                              <Badge variant="secondary" className="text-[10px]">
                                {task.status === "todo"
                                  ? t("ops.statusTodo")
                                  : task.status === "in_progress"
                                    ? t("ops.statusInProgress")
                                    : t("ops.statusCompleted")}
                              </Badge>
                              {due === "overdue" ? (
                                <Badge variant="danger" className="text-[10px]">
                                  {t("ops.due.overdue")}
                                </Badge>
                              ) : null}
                              {task.dueDate ? (
                                <span className="text-[11px] text-muted-foreground">
                                  {format(parseISO(task.dueDate), "d MMM", {
                                    locale: dateLocale,
                                  })}
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex min-h-[5.25rem] items-center gap-3.5 rounded-2xl border border-border/60 bg-card px-4 py-4 sm:px-5">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tone ?? "bg-muted/50"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}
