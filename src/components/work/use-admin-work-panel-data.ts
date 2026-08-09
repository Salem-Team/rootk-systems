import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkforceEmployees } from "@/services/employees.service";
import { getWorkMeetings, getWorkTasks } from "@/services/work.service";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { meetingWhen, openTaskCount, taskDueBucket } from "@/lib/work-utils";
import type { Employee } from "@/types";
import type { WorkMeeting, WorkTask } from "@/types/work";
import type { MeetingFilter, PanelTab, TaskFilter } from "@/components/work/admin-work-panel-types";

/** Loads admin work data (tasks/meetings/employees) and derives filtered views. */
export function useAdminWorkPanelData() {
  const [tab, setTab] = useState<PanelTab>("tasks");
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>("all");

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const reload = useCallback(async () => {
    const [tasksRes, meetingsRes, employeesRes] = await Promise.all([
      getWorkTasks(),
      getWorkMeetings(),
      getWorkforceEmployees(),
    ]);
    if (tasksRes.success) setTasks(tasksRes.data);
    if (meetingsRes.success) setMeetings(meetingsRes.data);
    if (employeesRes.success) setEmployees(employeesRes.data);
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
    const done = tasks.filter((x) => x.status === "completed").length;
    const today = meetings.filter((m) => meetingWhen(m.date) === "today").length;
    return { open, overdue, done, today, total: tasks.length };
  }, [tasks, meetings]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (assigneeFilter && !task.assigneeIds.includes(assigneeFilter)) {
        return false;
      }
      if (taskFilter === "overdue") {
        if (taskDueBucket(task.dueDate, task.status) !== "overdue") return false;
      } else if (taskFilter !== "all" && task.status !== taskFilter) {
        return false;
      }
      if (!q) return true;
      const names = task.assigneeIds
        .map((id) => employeeMap.get(id)?.name ?? "")
        .join(" ")
        .toLowerCase();
      return (
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.tag.toLowerCase().includes(q) ||
        names.includes(q)
      );
    });
  }, [tasks, taskFilter, assigneeFilter, query, employeeMap]);

  const assigneeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      for (const id of task.assigneeIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([id, count]) => ({
        id,
        count,
        name: employeeMap.get(id)?.name ?? id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, employeeMap]);

  const assigneeFilterName = assigneeFilter
    ? employeeMap.get(assigneeFilter)?.name ?? assigneeFilter
    : "";

  const filteredMeetings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meetings.filter((meeting) => {
      if (meetingFilter !== "all" && meetingWhen(meeting.date) !== meetingFilter) {
        return false;
      }
      if (!q) return true;
      const names = meeting.participantIds
        .map((id) => employeeMap.get(id)?.name ?? "")
        .join(" ")
        .toLowerCase();
      return (
        meeting.title.toLowerCase().includes(q) ||
        meeting.location.toLowerCase().includes(q) ||
        names.includes(q)
      );
    });
  }, [meetings, meetingFilter, query, employeeMap]);

  return {
    tab,
    setTab,
    tasks,
    meetings,
    employees,
    employeeMap,
    loading,
    query,
    setQuery,
    taskFilter,
    setTaskFilter,
    assigneeFilter,
    setAssigneeFilter,
    meetingFilter,
    setMeetingFilter,
    stats,
    filteredTasks,
    assigneeOptions,
    assigneeFilterName,
    filteredMeetings,
    reload,
  };
}
