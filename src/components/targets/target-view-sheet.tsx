"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmployeeAvatarStack } from "@/components/work/employee-multi-picker";
import {
  TargetPriorityBadge,
  TargetRiskBadge,
  TargetStatusBadge,
} from "@/components/targets/target-status-badge";
import {
  TargetProgressRing,
  type ProgressRingTone,
} from "@/components/targets/target-progress-ring";
import { getWorkTasks } from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import { taskDueBucket } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetCategory } from "@/types/targets";
import type { WorkTask } from "@/types/work";

const RING_TONE: Record<PerformanceTarget["health"], ProgressRingTone> = {
  excellent: "success",
  good: "success",
  average: "primary",
  warning: "warning",
  critical: "danger",
  delayed: "danger",
};

interface TargetViewSheetProps {
  target: PerformanceTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  onEdit?: (target: PerformanceTarget) => void;
}

/** Read-only target progress sheet: completion %, units, linked tasks. */
export function TargetViewSheet({
  target,
  open,
  onOpenChange,
  categories,
  employees,
  onEdit,
}: TargetViewSheetProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [linkedTasks, setLinkedTasks] = useState<WorkTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (!open || !target) {
      setLinkedTasks([]);
      return;
    }
    let mounted = true;
    setLoadingTasks(true);
    void (async () => {
      const res = await getWorkTasks();
      if (!mounted) return;
      if (res.success) {
        setLinkedTasks(res.data.filter((task) => task.targetId === target.id));
      } else {
        setLinkedTasks([]);
      }
      setLoadingTasks(false);
    })();
    return () => {
      mounted = false;
    };
  }, [open, target]);

  const percentage = target?.metrics?.percentage ?? 0;
  const category = target ? categories.get(target.categoryId) : undefined;
  const tasksDone = linkedTasks.filter((x) => x.status === "completed").length;
  const taskRate =
    linkedTasks.length === 0
      ? 0
      : Math.round((tasksDone / linkedTasks.length) * 1000) / 10;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {target ? (
          <>
            <SheetHeader>
              <SheetTitle className="pe-8 text-start leading-snug">
                {target.title}
              </SheetTitle>
              <SheetDescription className="text-start">
                {t("targets.view.description")}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <TargetProgressRing
                  percentage={percentage}
                  size={88}
                  strokeWidth={7}
                  tone={RING_TONE[target.health]}
                />
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("targets.view.completion")}
                  </p>
                  <p className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                    {Math.round(percentage)}
                    <span className="text-lg text-muted-foreground">%</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {target.completedQuantity}/{target.quantity} {target.unit}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <TargetStatusBadge status={target.status} />
                <TargetPriorityBadge priority={target.priority} />
                <TargetRiskBadge risk={target.riskLevel} />
                {category ? (
                  <Badge variant="outline" className="gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </Badge>
                ) : null}
              </div>

              {target.description ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {target.description}
                </p>
              ) : null}

              <dl className="grid gap-2.5 rounded-xl border border-border/60 p-3 text-[13px] sm:grid-cols-2">
                <Meta
                  label={t("targets.list.performance")}
                  value={String(target.performanceScore)}
                />
                <Meta
                  label={t("targets.view.taskRate")}
                  value={`${taskRate}%`}
                />
                <Meta
                  label={t("targets.assign.fieldStartDate")}
                  value={format(parseISO(target.startDate), "d MMM yyyy · h:mm a", {
                    locale: dateLocale,
                  })}
                />
                <Meta
                  label={t("targets.assign.fieldEndDate")}
                  value={format(parseISO(target.endDate), "d MMM yyyy · h:mm a", {
                    locale: dateLocale,
                  })}
                />
              </dl>

              <div>
                <p className="mb-2 text-[12px] font-semibold text-muted-foreground">
                  {t("targets.assign.fieldAssignees")}
                </p>
                <EmployeeAvatarStack
                  employees={employees}
                  ids={target.assigneeIds}
                  max={8}
                />
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {target.assigneeIds
                    .map((id) => employees.get(id)?.name ?? id)
                    .join(" · ")}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    {t("targets.view.linkedTasks")}
                  </p>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {tasksDone}/{linkedTasks.length}
                  </span>
                </div>
                {loadingTasks ? (
                  <p className="text-[13px] text-muted-foreground">
                    {t("common.loading")}
                  </p>
                ) : linkedTasks.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    {t("targets.view.noLinkedTasks")}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {linkedTasks.map((task) => {
                      const due = taskDueBucket(task.dueDate, task.status);
                      return (
                        <li
                          key={task.id}
                          className="flex items-start gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2"
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                due === "overdue"
                                  ? "text-rose-500"
                                  : "text-muted-foreground"
                              )}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">
                              {task.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {task.status === "todo"
                                ? t("ops.statusTodo")
                                : task.status === "in_progress"
                                  ? t("ops.statusInProgress")
                                  : t("ops.statusCompleted")}
                              {task.dueDate
                                ? ` · ${format(parseISO(task.dueDate), "d MMM", { locale: dateLocale })}`
                                : ""}
                              {due === "overdue"
                                ? ` · ${t("ops.due.overdue")}`
                                : ""}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {onEdit ? (
                  <Button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(target);
                    }}
                  >
                    {t("common.edit")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function TargetViewButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <Eye className="h-3.5 w-3.5" />
      {t("common.view")}
    </Button>
  );
}
