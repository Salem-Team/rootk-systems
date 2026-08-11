"use client";

import { useCallback, useMemo, useState } from "react";
import { Target } from "lucide-react";
import { EmployeeTargetsTable } from "@/components/targets/employee-targets-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { useLiveReload } from "@/hooks/use-live-reload";
import { getEmployeeTargetPerformance } from "@/services/targets.service";
import { getMyWorkTasks } from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import { TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";
import type {
  EmployeeTargetPerformance,
  PerformanceTarget,
  TargetCategory,
} from "@/types/targets";
import type { WorkTask } from "@/types/work";

interface EmployeePerformancePanelProps {
  employeeId: string;
  categories: Map<string, TargetCategory>;
  categoryId?: string;
  onView?: (target: PerformanceTarget) => void;
  className?: string;
}

/** Employee assigned targets as a full-page table (Done + notes). */
export function EmployeePerformancePanel({
  employeeId,
  categories,
  categoryId,
  onView,
  className,
}: EmployeePerformancePanelProps) {
  const { t } = useTranslation();
  const [performance, setPerformance] = useState<EmployeeTargetPerformance | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!employeeId) {
      setPerformance(null);
      setLinkedTasks([]);
      setLoading(false);
      return;
    }
    const [perfRes, tasksRes] = await Promise.all([
      getEmployeeTargetPerformance(employeeId),
      getMyWorkTasks(employeeId),
    ]);
    if (perfRes.success) setPerformance(perfRes.data);
    if (tasksRes.success) {
      setLinkedTasks(tasksRes.data.filter((task) => Boolean(task.targetId)));
    }
    setLoading(false);
  }, [employeeId]);

  useLiveReload(reload, [TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT]);

  const scopedTargets = useMemo(() => {
    if (!performance) return [] as PerformanceTarget[];
    if (!categoryId) return performance.targets;
    return performance.targets.filter((x) => x.categoryId === categoryId);
  }, [performance, categoryId]);

  if (loading) return <TableSkeleton rows={8} />;
  if (!performance) {
    return (
      <EmptyState
        icon={Target}
        title={t("targets.employeePerf.emptyTargets")}
        description={t("targets.employeePerf.emptyTargetsDesc")}
      />
    );
  }

  return (
    <section
      className={cn("flex min-h-[min(70vh,44rem)] flex-col gap-3", className)}
    >
      <div>
        <h3 className="text-[0.95rem] font-semibold tracking-tight">
          {t("targets.employeePerf.targetsList")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("targets.employeePerf.targetsListHint")}
        </p>
      </div>
      <EmployeeTargetsTable
        targets={scopedTargets}
        categories={categories}
        linkedTasks={linkedTasks}
        onView={onView}
        onTaskCompleted={() => void reload()}
        className="flex-1"
      />
    </section>
  );
}
