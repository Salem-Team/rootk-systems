"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AlertOctagon, ClipboardList, ShieldAlert, TimerReset } from "lucide-react";
import { TargetList } from "@/components/targets/target-list";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { EmployeeAvatarStack } from "@/components/work/employee-multi-picker";
import { getDelayedCenter } from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetCategory } from "@/types/targets";
import type { WorkTask } from "@/types/work";

interface DelayedCenterData {
  delayedTargets: PerformanceTarget[];
  criticalTargets: PerformanceTarget[];
  highRiskTargets: PerformanceTarget[];
  delayedTasks: WorkTask[];
}

interface DelayedCenterProps {
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  categoryId?: string;
  onView?: (target: PerformanceTarget) => void;
  onEdit?: (target: PerformanceTarget) => void;
  onSendWarning?: (target: PerformanceTarget) => void;
  className?: string;
}

/** Focused view of delayed/critical/high-risk targets plus overdue tasks. */
export function DelayedCenter({
  categories,
  employees,
  categoryId,
  onView,
  onEdit,
  onSendWarning,
  className,
}: DelayedCenterProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [data, setData] = useState<DelayedCenterData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await getDelayedCenter();
    if (res.success) setData(res.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  const scoped = useMemo(() => {
    if (!data) return null;
    if (!categoryId) return data;
    const match = (t: PerformanceTarget) => t.categoryId === categoryId;
    return {
      delayedTargets: data.delayedTargets.filter(match),
      criticalTargets: data.criticalTargets.filter(match),
      highRiskTargets: data.highRiskTargets.filter(match),
      delayedTasks: data.delayedTasks,
    };
  }, [data, categoryId]);

  const tasksByEmployee = useMemo(() => {
    if (!scoped) return [] as Array<{ employeeId: string; tasks: WorkTask[] }>;
    const map = new Map<string, WorkTask[]>();
    for (const task of scoped.delayedTasks) {
      for (const id of task.assigneeIds) {
        map.set(id, [...(map.get(id) ?? []), task]);
      }
    }
    return [...map.entries()].map(([employeeId, tasks]) => ({ employeeId, tasks }));
  }, [scoped]);

  if (loading || !scoped) return <TableSkeleton rows={4} />;

  return (
    <div className={cn("space-y-5", className)}>
      <Section
        icon={<TimerReset className="h-3.5 w-3.5 text-amber-600" aria-hidden />}
        title={t("targets.delayed.delayedTargets")}
        count={scoped.delayedTargets.length}
      >
        <TargetList
          targets={scoped.delayedTargets}
          categories={categories}
          employees={employees}
          onView={onView}
          onEdit={onEdit}
          onSendWarning={onSendWarning}
        />
      </Section>

      <Section
        icon={<AlertOctagon className="h-3.5 w-3.5 text-rose-600" aria-hidden />}
        title={t("targets.delayed.criticalTargets")}
        count={scoped.criticalTargets.length}
      >
        <TargetList
          targets={scoped.criticalTargets}
          categories={categories}
          employees={employees}
          onView={onView}
          onEdit={onEdit}
          onSendWarning={onSendWarning}
        />
      </Section>

      <Section
        icon={<ShieldAlert className="h-3.5 w-3.5 text-orange-600" aria-hidden />}
        title={t("targets.delayed.highRiskTargets")}
        count={scoped.highRiskTargets.length}
      >
        <TargetList
          targets={scoped.highRiskTargets}
          categories={categories}
          employees={employees}
          onView={onView}
          onEdit={onEdit}
          onSendWarning={onSendWarning}
        />
      </Section>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <ClipboardList className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("targets.delayed.delayedTasks")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("targets.delayed.delayedTasksDesc")}
          </p>
        </div>
        <div className="panel-body">
          {tasksByEmployee.length === 0 ? (
            <EmptyState compact title={t("targets.delayed.noTasks")} />
          ) : (
            <div className="space-y-4">
              {tasksByEmployee.map((group) => (
                <div key={group.employeeId}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <EmployeeAvatarStack employees={employees} ids={[group.employeeId]} max={1} />
                    <p className="text-sm font-medium">
                      {employees.get(group.employeeId)?.name ?? group.employeeId}
                    </p>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      ({group.tasks.length})
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {group.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="list-row flex items-center justify-between gap-3 px-3 py-2 text-[13px]"
                      >
                        <span className="min-w-0 truncate">{task.title}</span>
                        <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                          {task.dueDate
                            ? format(parseISO(task.dueDate), "d MMM", { locale: dateLocale })
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon?: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-[0.95rem] font-semibold">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}
