"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  ListTodo,
  Loader2,
  Percent,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/use-translation";
import {
  computeEmployeeTaskPerformance,
  type EmployeeTaskPerformance,
} from "@/lib/employee-task-performance";
import { getInitials, cn } from "@/lib/utils";
import { getWorkTasks } from "@/services/work.service";
import type { Employee } from "@/types";

function emptyStats(since: string): EmployeeTaskPerformance {
  return { total: 0, completed: 0, incomplete: 0, rate: 0, since };
}

export function EmployeePerformanceDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const employeeId = employee?.id;
  const joinDate = employee?.joinDate ?? "";
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EmployeeTaskPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !employeeId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setStats(null);
    void getWorkTasks({ employeeId }).then((res) => {
      if (!mounted) return;
      setLoading(false);
      if (!res.success) {
        setError(res.message ?? t("common.error"));
        setStats(emptyStats(joinDate));
        return;
      }
      setStats(computeEmployeeTaskPerformance(res.data, employeeId, joinDate));
    });
    return () => {
      mounted = false;
    };
  }, [open, employeeId, joinDate, t]);

  if (!employee) return null;

  const rateColor =
    !stats || stats.total === 0
      ? "text-muted-foreground"
      : stats.rate >= 75
        ? "text-emerald-700 dark:text-emerald-400"
        : stats.rate >= 40
          ? "text-amber-700 dark:text-amber-400"
          : "text-rose-700 dark:text-rose-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
            {t("employees.performanceTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("employees.performanceDesc", {
              date: employee.joinDate.slice(0, 10),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
          <Avatar className="h-11 w-11 border border-border">
            {employee.avatar ? (
              <AvatarImage src={employee.avatar} alt={employee.name} />
            ) : null}
            <AvatarFallback className="bg-primary/[0.08] text-sm font-semibold text-primary">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{employee.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {employee.position} · {employee.employeeId}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="section-label">{t("employees.performanceRate")}</p>
                  <p className={cn("mt-1 text-3xl font-semibold tabular-nums", rateColor)}>
                    {stats?.rate ?? 0}
                    <span className="ms-0.5 text-lg font-medium">%</span>
                  </p>
                </div>
                <Percent className={cn("h-5 w-5", rateColor)} aria-hidden />
              </div>
              <Progress
                value={stats?.rate ?? 0}
                className="mt-3 h-2"
                aria-label={t("employees.performanceRate")}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("employees.performanceWindow", {
                  date: stats?.since ?? employee.joinDate.slice(0, 10),
                })}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatTile
                icon={ListTodo}
                label={t("employees.performanceTotal")}
                value={stats?.total ?? 0}
              />
              <StatTile
                icon={CheckCircle2}
                label={t("employees.performanceDone")}
                value={stats?.completed ?? 0}
                tone="success"
              />
              <StatTile
                icon={CircleDashed}
                label={t("employees.performanceOpen")}
                value={stats?.incomplete ?? 0}
                tone="warning"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ListTodo;
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-2.5 py-3 text-center">
      <Icon
        className={cn(
          "mx-auto h-3.5 w-3.5",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
          !tone && "text-muted-foreground"
        )}
        aria-hidden
      />
      <p className="mt-1.5 text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/** Standalone trigger + dialog for list rows/cards. */
export function EmployeePerformanceButton({
  employee,
  className,
  size = "sm",
  variant = "outline",
}: {
  employee: Employee;
  className?: string;
  size?: "sm" | "icon" | "default";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        aria-label={t("employees.actionPerformance")}
        title={t("employees.actionPerformance")}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <TrendingUp className="h-3.5 w-3.5" />
        {size === "icon" ? null : (
          <span className="hidden sm:inline">
            {t("employees.actionPerformance")}
          </span>
        )}
      </Button>
      <EmployeePerformanceDialog
        employee={employee}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
