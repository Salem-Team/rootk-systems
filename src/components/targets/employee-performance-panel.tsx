"use client";

import { useCallback, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  ListTodo,
  Target,
  TimerReset,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TargetList } from "@/components/targets/target-list";
import { StaggerItem, StaggerList } from "@/components/shared/stagger";
import { TableSkeleton } from "@/components/shared/loading-state";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useLiveReload } from "@/hooks/use-live-reload";
import { getEmployeeTargetPerformance } from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  EmployeeTargetPerformance,
  PerformanceTarget,
  TargetCategory,
} from "@/types/targets";

interface EmployeePerformancePanelProps {
  employeeId: string;
  categories: Map<string, TargetCategory>;
  employees: Map<string, Employee>;
  categoryId?: string;
  onEdit?: (target: PerformanceTarget) => void;
  onView?: (target: PerformanceTarget) => void;
  className?: string;
}

/** Employee performance score, trend, and their assigned targets. */
export function EmployeePerformancePanel({
  employeeId,
  categories,
  employees,
  categoryId,
  onEdit,
  onView,
  className,
}: EmployeePerformancePanelProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [performance, setPerformance] = useState<EmployeeTargetPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!employeeId) {
      setPerformance(null);
      setLoading(false);
      return;
    }
    const res = await getEmployeeTargetPerformance(employeeId);
    if (res.success) setPerformance(res.data);
    setLoading(false);
  }, [employeeId]);

  useLiveReload(reload, [TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT]);

  const scopedTargets = useMemo(() => {
    if (!performance) return [] as PerformanceTarget[];
    if (!categoryId) return performance.targets;
    return performance.targets.filter((t) => t.categoryId === categoryId);
  }, [performance, categoryId]);

  if (loading || !performance) return <TableSkeleton rows={4} />;

  return (
    <div className={cn("space-y-5", className)}>
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
            value={performance.currentTargets}
            icon={Target}
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.kpi.completed")}
            value={performance.completed}
            icon={CheckCircle2}
            tone="text-emerald-700 dark:text-emerald-400"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.employeePerf.remaining")}
            value={performance.remaining}
            icon={ListTodo}
            tone="text-sky-700 dark:text-sky-400"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.employeePerf.warnings")}
            value={performance.warnings}
            icon={AlertTriangle}
            tone="text-amber-700 dark:text-amber-400"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
        <StaggerItem className="min-w-0">
          <KpiCard
            label={t("targets.employeePerf.delayedTasks")}
            value={performance.delayedTasks}
            icon={TimerReset}
            tone="text-rose-700 dark:text-rose-400"
            className="h-full min-h-[6.5rem]"
          />
        </StaggerItem>
      </StaggerList>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("targets.employeePerf.monthlyTrend")}
          </h3>
        </div>
        <div className="panel-body h-[220px]">
          {performance.monthlyTrend.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("targets.dashboard.noData")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={performance.monthlyTrend}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar
                  dataKey="score"
                  name={t("targets.list.performance")}
                  fill={CHART.rate}
                  radius={[6, 6, 0, 0]}
                  animationDuration={reduceMotion ? 0 : 900}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="space-y-3">
        <div>
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {t("targets.employeePerf.targetsList")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("targets.employeePerf.targetsListHint")}
          </p>
        </div>
        <TargetList
          targets={scopedTargets}
          categories={categories}
          employees={employees}
          onEdit={onEdit}
          onView={onView}
        />
      </div>
    </div>
  );
}
