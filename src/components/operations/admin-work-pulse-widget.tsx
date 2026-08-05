"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SoftListRow } from "@/components/shared/meta-chip";
import { StatChip } from "@/components/shared/stat-chip";
import { OpsWidget } from "@/components/operations/ops-widget";
import { getWorkMeetings, getWorkTasks } from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import {
  meetingWhen,
  openTaskCount,
  taskDueBucket,
} from "@/lib/work-utils";
import type { WorkMeeting, WorkTask } from "@/types/work";

/** Compact admin pulse for team tasks & meetings on the operations dashboard. */
export function AdminWorkPulseWidget() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);

  const reload = useCallback(async () => {
    const [tasksRes, meetingsRes] = await Promise.all([
      getWorkTasks(),
      getWorkMeetings(),
    ]);
    if (tasksRes.success) setTasks(tasksRes.data);
    if (meetingsRes.success) setMeetings(meetingsRes.data);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onUpdate = () => {
      void reload();
    };
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
  }, [reload]);

  const stats = useMemo(() => {
    const open = openTaskCount(tasks);
    const overdue = tasks.filter(
      (x) => taskDueBucket(x.dueDate, x.status) === "overdue"
    ).length;
    const todayMeetings = meetings.filter(
      (m) => meetingWhen(m.date) === "today"
    ).length;
    const upcoming = meetings.filter(
      (m) => meetingWhen(m.date) === "upcoming"
    ).length;
    return { open, overdue, todayMeetings, upcoming };
  }, [tasks, meetings]);

  const spotlight = tasks
    .filter((x) => x.status !== "completed")
    .sort((a, b) => {
      const dueRank = (task: WorkTask) => {
        const d = taskDueBucket(task.dueDate, task.status);
        if (d === "overdue") return 0;
        if (d === "today") return 1;
        if (d === "none") return 3;
        return 2;
      };
      return (
        dueRank(a) - dueRank(b) ||
        (a.dueDate || "\uffff").localeCompare(b.dueDate || "\uffff")
      );
    })
    .slice(0, 4);

  return (
    <OpsWidget
      id="admin-work"
      title={t("workAdmin.pulseTitle")}
      description={t("workAdmin.pulseDesc")}
      actions={
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link href="/tasks">
            {t("workAdmin.openWorkspace")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          icon={ListTodo}
          label={t("workAdmin.kpiOpen")}
          value={stats.open}
          compact
        />
        <StatChip
          icon={AlertTriangle}
          label={t("workAdmin.kpiOverdue")}
          value={stats.overdue}
          compact
          className={
            stats.overdue > 0
              ? "[&_.stat-value]:text-rose-600 dark:[&_.stat-value]:text-rose-400"
              : undefined
          }
        />
        <StatChip
          icon={CalendarDays}
          label={t("workAdmin.kpiTodayMeetings")}
          value={stats.todayMeetings}
          compact
        />
        <StatChip
          icon={CalendarDays}
          label={t("workAdmin.when.upcoming")}
          value={stats.upcoming}
          compact
        />
      </div>

      <ul className="space-y-2">
        {spotlight.map((task) => {
          const due = taskDueBucket(task.dueDate, task.status);
          return (
            <li key={task.id}>
              <SoftListRow className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{task.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {task.assigneeIds.length} {t("workHub.people")}
                    {task.tag ? ` · ${task.tag}` : ""}
                  </p>
                </div>
                <Badge variant={due === "overdue" ? "danger" : "outline"}>
                  {t(`ops.due.${due}`)}
                </Badge>
              </SoftListRow>
            </li>
          );
        })}
        {spotlight.length === 0 ? (
          <li className="rounded-xl border border-dashed px-3 py-6 text-center text-[12px] text-muted-foreground">
            {t("workAdmin.emptyTasks")}
          </li>
        ) : null}
      </ul>
    </OpsWidget>
  );
}
