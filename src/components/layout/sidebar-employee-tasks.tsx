"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Circle, ListTodo } from "lucide-react";
import {
  getMyWorkMeetings,
  getMyWorkTasks,
} from "@/services/work.service";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { meetingWhen, openTaskCount } from "@/lib/work-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkMeeting, WorkTask } from "@/types/work";

/** Compact work preview (tasks + next meeting) for the employee sidebar. */
export function SidebarEmployeeTasks({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const { t } = useTranslation();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);

  const reload = useCallback(async () => {
    const [tasksRes, meetingsRes] = await Promise.all([
      getMyWorkTasks(workEmployeeId),
      getMyWorkMeetings(workEmployeeId),
    ]);
    if (tasksRes.success) setTasks(tasksRes.data);
    if (meetingsRes.success) setMeetings(meetingsRes.data);
  }, [workEmployeeId]);

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

  if (collapsed) return null;

  const openTasks = tasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress"
  );
  const preview = openTasks.slice(0, 3);
  const nextMeeting =
    meetings.find((m) => meetingWhen(m.date) === "today") ??
    meetings.find((m) => meetingWhen(m.date) === "upcoming") ??
    null;

  return (
    <section
      className="mx-2.5 mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02]"
      aria-label={t("sidebarTasks.label")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            {t("sidebarTasks.label")}
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-white">
            {t("sidebarTasks.title")}
          </p>
        </div>
        <Badge className="border-amber-300/40 bg-amber-300 text-[10px] font-bold text-amber-950">
          {openTaskCount(tasks)}
        </Badge>
      </div>

      {nextMeeting ? (
        <Link
          href={`/tasks?tab=meetings&meeting=${nextMeeting.id}`}
          className="mx-2 mt-2 flex items-start gap-2 rounded-lg border border-sky-300/15 bg-sky-400/[0.08] px-2.5 py-2 transition-colors hover:bg-sky-400/[0.12]"
        >
          <CalendarDays
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-200"
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-sky-200/80">
              {t("sidebarTasks.nextMeeting")}
            </span>
            <span className="mt-0.5 block truncate text-[12px] font-medium text-white">
              {nextMeeting.title}
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-white/45">
              {nextMeeting.startTime}–{nextMeeting.endTime}
            </span>
          </span>
        </Link>
      ) : null}

      <ul className="space-y-1 px-2 py-2">
        {preview.length === 0 ? (
          <li className="px-2 py-3 text-center text-[12px] text-white/45">
            {t("sidebarTasks.empty")}
          </li>
        ) : (
          preview.map((task) => (
            <li key={task.id}>
              <Link
                href={`/tasks?tab=tasks&task=${task.id}`}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06]"
                )}
              >
                <Circle
                  className={cn(
                    "mt-0.5 h-3 w-3 shrink-0",
                    task.status === "in_progress"
                      ? "text-sky-300"
                      : "text-white/35"
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium text-white/90">
                    {task.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40">
                    <ListTodo className="h-2.5 w-2.5" aria-hidden />
                    {task.tag || t(`ops.priority.${task.priority}`)}
                  </span>
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>

      <Link
        href="/tasks"
        className="block border-t border-white/[0.06] px-3 py-2.5 text-center text-[11px] font-semibold text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white"
      >
        {t("sidebarTasks.viewAll")}
      </Link>
    </section>
  );
}
