import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  buildOpsChecklist,
  buildOpsGoals,
} from "@/components/operations/operations-mock-data";
import { getEmployees } from "@/services/employees.service";
import { getMyWorkMeetings, getMyWorkTasks } from "@/services/work.service";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { meetingWhen, taskDueBucket } from "@/lib/work-utils";
import type { Employee } from "@/types";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";
import type { OriginFilter, WorkTab } from "@/components/work/employee-work-hub-types";

/** Loads employee work data (tasks/meetings/employees/checklist) and derives tab/detail views. */
export function useEmployeeWorkHubData(workEmployeeId: string) {
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [checklist, setChecklist] = useState(buildOpsChecklist);
  const goals = useMemo(() => buildOpsGoals(), []);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<WorkTab>("tasks");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMobileDetailOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const reload = useCallback(async () => {
    const [tasksRes, meetingsRes, employeesRes] = await Promise.all([
      getMyWorkTasks(workEmployeeId),
      getMyWorkMeetings(workEmployeeId),
      getEmployees(),
    ]);
    if (tasksRes.success) setTasks(tasksRes.data);
    if (meetingsRes.success) setMeetings(meetingsRes.data);
    if (employeesRes.success) setEmployees(employeesRes.data);
  }, [workEmployeeId]);

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

  useEffect(() => {
    const qTab = searchParams.get("tab");
    if (qTab === "meetings" || qTab === "day" || qTab === "tasks") setTab(qTab);
    const taskId = searchParams.get("task");
    const meetingId = searchParams.get("meeting");
    if (taskId) {
      setTab("tasks");
      setSelectedTaskId(taskId);
      if (isMobile) setMobileDetailOpen(true);
    }
    if (meetingId) {
      setTab("meetings");
      setSelectedMeetingId(meetingId);
      if (isMobile) setMobileDetailOpen(true);
    }
  }, [searchParams, isMobile]);

  const openTasks = tasks.filter(
    (x) => x.status === "todo" || x.status === "in_progress"
  );
  const overdue = tasks.filter(
    (x) => taskDueBucket(x.dueDate, x.status) === "overdue"
  );
  const todayMeetings = meetings.filter((m) => meetingWhen(m.date) === "today");
  const upcomingMeetings = meetings.filter(
    (m) => meetingWhen(m.date) === "upcoming"
  );
  const checklistDone = checklist.filter((i) => i.done).length;
  const checklistPct = Math.round(
    (checklistDone / Math.max(checklist.length, 1)) * 100
  );

  const selectedTask =
    tasks.find((x) => x.id === selectedTaskId) ??
    (filter === "all" ? tasks[0] : tasks.find((x) => x.status === filter)) ??
    null;
  const selectedMeeting =
    meetings.find((x) => x.id === selectedMeetingId) ??
    todayMeetings[0] ??
    meetings[0] ??
    null;

  const visibleTasks = useMemo(() => {
    let list = filter === "all" ? tasks : tasks.filter((x) => x.status === filter);
    if (originFilter !== "all") {
      list = list.filter((x) => (x.origin ?? "assigned") === originFilter);
    }
    return list;
  }, [tasks, filter, originFilter]);

  const filteredTodayMeetings = useMemo(() => {
    if (originFilter === "all") return todayMeetings;
    return todayMeetings.filter(
      (m) => (m.origin ?? "assigned") === originFilter
    );
  }, [todayMeetings, originFilter]);

  const filteredUpcomingMeetings = useMemo(() => {
    if (originFilter === "all") return upcomingMeetings;
    return upcomingMeetings.filter(
      (m) => (m.origin ?? "assigned") === originFilter
    );
  }, [upcomingMeetings, originFilter]);

  function selectTask(id: string) {
    setSelectedTaskId(id);
    if (isMobile) setMobileDetailOpen(true);
  }

  function selectMeeting(id: string) {
    setSelectedMeetingId(id);
    if (isMobile) setMobileDetailOpen(true);
  }

  function nameOf(id: string) {
    return employeeMap.get(id)?.name ?? id;
  }

  return {
    tab,
    setTab,
    filter,
    setFilter,
    originFilter,
    setOriginFilter,
    tasks,
    setTasks,
    meetings,
    employees,
    employeeMap,
    checklist,
    setChecklist,
    goals,
    loading,
    selectedTaskId,
    setSelectedTaskId,
    selectedMeetingId,
    setSelectedMeetingId,
    mobileDetailOpen,
    setMobileDetailOpen,
    isMobile,
    openTasks,
    overdue,
    todayMeetings,
    checklistDone,
    checklistPct,
    selectedTask,
    selectedMeeting,
    visibleTasks,
    filteredTodayMeetings,
    filteredUpcomingMeetings,
    selectTask,
    selectMeeting,
    nameOf,
    reload,
  };
}
