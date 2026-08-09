"use client";

import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Target } from "lucide-react";
import {
  TargetPriorityBadge,
  TargetRiskBadge,
  TargetStatusBadge,
} from "@/components/targets/target-status-badge";
import { TargetProgressRing } from "@/components/targets/target-progress-ring";
import { WorkDurationCell } from "@/components/work/work-duration-cell";
import { useTranslation } from "@/hooks/use-translation";
import { taskDueBucket } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { PerformanceTarget, TargetCategory } from "@/types/targets";
import type { WorkTask } from "@/types/work";
import { RING_TONE } from "./performance-report-utils";

export function EmployeeTargetBreakdown({
  personTargets,
  categories,
  tasksByTarget,
  dateLocale,
  onView,
  onEdit,
}: {
  personTargets: PerformanceTarget[];
  categories: Map<string, TargetCategory>;
  tasksByTarget: Map<string, WorkTask[]>;
  dateLocale: Locale;
  onView?: (target: PerformanceTarget) => void;
  onEdit?: (target: PerformanceTarget) => void;
}) {
  const { t } = useTranslation();

  return (
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
              <li key={target.id} className="surface-panel overflow-hidden">
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
                      {target.completedQuantity}/{target.quantity} {target.unit}
                      {" · "}
                      {t("targets.list.performance")}:{" "}
                      <span className="font-mono tabular-nums">
                        {target.performanceScore}
                      </span>
                      {" · "}
                      {format(parseISO(target.endDate), "d MMM yyyy · h:mm a", {
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
                            <WorkDurationCell task={task} />
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
  );
}
