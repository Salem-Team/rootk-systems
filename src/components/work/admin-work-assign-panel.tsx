"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  EmployeeAvatarStack,
  EmployeeMultiPicker,
} from "@/components/work/employee-multi-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Time12Input } from "@/components/ui/time-12-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkforceEmployees } from "@/services/employees.service";
import {
  createWorkMeeting,
  createWorkTask,
  deleteWorkMeeting,
  deleteWorkTask,
  getWorkMeetings,
  getWorkTasks,
  updateWorkMeeting,
  updateWorkTask,
} from "@/services/work.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { formatClockRange } from "@/lib/format-time";
import {
  meetingWhen,
  openTaskCount,
  taskDueBucket,
  todayIsoDate,
} from "@/lib/work-utils";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { Employee } from "@/types";
import type {
  TaskPriority,
  TaskStatus,
  WorkMeeting,
  WorkTask,
} from "@/types/work";

type PanelTab = "tasks" | "meetings";
type TaskFilter = "all" | TaskStatus | "overdue";
type MeetingFilter = "all" | "today" | "upcoming" | "past";

const PRIORITY_VARIANT = {
  high: "danger",
  medium: "warning",
  low: "info",
} as const;

interface TaskFormState {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  tag: string;
  estimateMin: number;
  assigneeIds: string[];
  relatedMeetingId: string;
  subItemsText: string;
}

interface MeetingFormState {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organizerId: string;
  participantIds: string[];
  agendaText: string;
  notes: string;
  joinUrl: string;
}

function emptyTaskForm(): TaskFormState {
  return {
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 0,
    assigneeIds: [],
    relatedMeetingId: "",
    subItemsText: "",
  };
}

function emptyMeetingForm(organizerId: string): MeetingFormState {
  return {
    title: "",
    date: todayIsoDate(),
    startTime: "10:00",
    endTime: "11:00",
    location: "",
    organizerId,
    participantIds: organizerId ? [organizerId] : [],
    agendaText: "",
    notes: "",
    joinUrl: "",
  };
}

function taskToForm(task: WorkTask): TaskFormState {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tag: task.tag,
    estimateMin: task.estimateMin,
    assigneeIds: [...task.assigneeIds],
    relatedMeetingId: task.relatedMeetingId ?? "",
    subItemsText: task.subItems.map((s) => s.label).join("\n"),
  };
}

function meetingToForm(meeting: WorkMeeting): MeetingFormState {
  return {
    title: meeting.title,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    organizerId: meeting.organizerId,
    participantIds: [...meeting.participantIds],
    agendaText: meeting.agenda.join("\n"),
    notes: meeting.notes,
    joinUrl: meeting.joinUrl ?? "",
  };
}

export function AdminWorkAssignPanel() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const [tab, setTab] = useState<PanelTab>("tasks");
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>("all");

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "task"; id: string; title: string }
    | { kind: "meeting"; id: string; title: string }
    | null
  >(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [meetingForm, setMeetingForm] = useState<MeetingFormState>(() =>
    emptyMeetingForm(workEmployeeId)
  );

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
  }, [tasks, taskFilter, query, employeeMap]);

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

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm());
    setTaskDialogOpen(true);
  }

  function openEditTask(task: WorkTask) {
    setEditingTaskId(task.id);
    setTaskForm(taskToForm(task));
    setTaskDialogOpen(true);
  }

  function openCreateMeeting() {
    setEditingMeetingId(null);
    setMeetingForm(emptyMeetingForm(workEmployeeId));
    setMeetingDialogOpen(true);
  }

  function openEditMeeting(meeting: WorkMeeting) {
    setEditingMeetingId(meeting.id);
    setMeetingForm(meetingToForm(meeting));
    setMeetingDialogOpen(true);
  }

  async function saveTask() {
    if (!taskForm.title.trim() || taskForm.assigneeIds.length === 0) {
      toast.error(t("workAdmin.validationTask"));
      return;
    }
    setBusy(true);
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      status: taskForm.status,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate,
      tag: taskForm.tag.trim(),
      estimateMin: taskForm.estimateMin || 0,
      assigneeIds: taskForm.assigneeIds,
      relatedMeetingId: taskForm.relatedMeetingId || undefined,
      origin: "assigned" as const,
      subItems: taskForm.subItemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((label) => {
          const existing = editingTaskId
            ? tasks
                .find((x) => x.id === editingTaskId)
                ?.subItems.find((s) => s.label === label)
            : undefined;
          return {
            id: existing?.id,
            label,
            done: existing?.done ?? false,
          };
        }),
    };
    const res = editingTaskId
      ? await updateWorkTask(editingTaskId, payload)
      : await createWorkTask(payload);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setTaskDialogOpen(false);
    await reload();
    toast.success(
      editingTaskId ? t("workAdmin.taskUpdated") : t("workAdmin.taskCreated")
    );
  }

  async function saveMeeting() {
    if (
      !meetingForm.title.trim() ||
      !meetingForm.location.trim() ||
      meetingForm.participantIds.length === 0
    ) {
      toast.error(t("workAdmin.validationMeeting"));
      return;
    }
    setBusy(true);
    const payload = {
      title: meetingForm.title.trim(),
      date: meetingForm.date,
      startTime: meetingForm.startTime,
      endTime: meetingForm.endTime,
      location: meetingForm.location.trim(),
      organizerId: meetingForm.organizerId || workEmployeeId,
      participantIds: meetingForm.participantIds,
      agenda: meetingForm.agendaText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      notes: meetingForm.notes.trim(),
      joinUrl: meetingForm.joinUrl.trim(),
      origin: "assigned" as const,
    };
    const res = editingMeetingId
      ? await updateWorkMeeting(editingMeetingId, payload)
      : await createWorkMeeting(payload);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setMeetingDialogOpen(false);
    await reload();
    toast.success(
      editingMeetingId
        ? t("workAdmin.meetingUpdated")
        : t("workAdmin.meetingCreated")
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res =
      deleteTarget.kind === "task"
        ? await deleteWorkTask(deleteTarget.id)
        : await deleteWorkMeeting(deleteTarget.id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDeleteTarget(null);
    await reload();
    toast.success(
      deleteTarget.kind === "task"
        ? t("workAdmin.taskDeleted")
        : t("workAdmin.meetingDeleted")
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <motion.section
        variants={fadeInUp}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="relative overflow-hidden rounded-[1.5rem] border border-primary/20 bg-[linear-gradient(155deg,#061c4a_0%,#082868_48%,#0c3a7a_100%)] p-5 text-primary-foreground shadow-[var(--shadow-card-hover)] sm:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 90% 12%, rgba(255,255,255,0.16), transparent 34%), radial-gradient(circle at 8% 88%, rgba(56,189,248,0.16), transparent 40%)",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {t("workAdmin.eyebrow")}
            </p>
            <h1 className="font-display mt-2 text-[1.45rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
              {t("workAdmin.title")}
            </h1>
            <p className="mt-2 hidden text-[14px] leading-relaxed text-white/72 sm:block">
              {t("workAdmin.description")}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
            <StatChip
              icon={<ListTodo className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiOpen")}
              value={String(stats.open)}
            />
            <StatChip
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiOverdue")}
              value={String(stats.overdue)}
            />
            <StatChip
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiDone")}
              value={String(stats.done)}
            />
            <StatChip
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiTodayMeetings")}
              value={String(stats.today)}
            />
          </div>
        </div>
      </motion.section>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as PanelTab);
          setQuery("");
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:inline-grid sm:w-auto sm:rounded-2xl sm:p-1.5">
            <TabsTrigger
              value="tasks"
              className="min-h-10 gap-1 rounded-lg px-2 text-[12px] sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-[13px]"
            >
              <ListTodo className="hidden h-3.5 w-3.5 sm:me-1.5 sm:inline" aria-hidden />
              {t("workAdmin.tabTasks")}
              <span className="ms-1 font-mono text-[10px] opacity-70 sm:ms-1.5">
                {tasks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="meetings"
              className="min-h-10 gap-1 rounded-lg px-2 text-[12px] sm:min-h-11 sm:rounded-xl sm:px-4 sm:text-[13px]"
            >
              <CalendarDays className="hidden h-3.5 w-3.5 sm:me-1.5 sm:inline" aria-hidden />
              {t("workAdmin.tabMeetings")}
              <span className="ms-1 font-mono text-[10px] opacity-70 sm:ms-1.5">
                {meetings.length}
              </span>
            </TabsTrigger>
          </TabsList>
          {tab === "tasks" ? (
            <Button type="button" onClick={openCreateTask}>
              <Plus className="h-4 w-4" />
              {t("workAdmin.addTask")}
            </Button>
          ) : (
            <Button type="button" onClick={openCreateMeeting}>
              <Plus className="h-4 w-4" />
              {t("workAdmin.addMeeting")}
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "tasks"
                  ? t("workAdmin.searchTasks")
                  : t("workAdmin.searchMeetings")
              }
              className="h-10 rounded-xl ps-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tab === "tasks"
              ? (
                  [
                    ["all", t("common.all")],
                    ["todo", t("ops.statusTodo")],
                    ["in_progress", t("ops.statusInProgress")],
                    ["completed", t("ops.statusCompleted")],
                    ["overdue", t("ops.due.overdue")],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={taskFilter === id ? "default" : "outline"}
                    className="h-8 rounded-full px-3 text-[12px]"
                    onClick={() => setTaskFilter(id)}
                  >
                    {label}
                  </Button>
                ))
              : (
                  [
                    ["all", t("common.all")],
                    ["today", t("workAdmin.when.today")],
                    ["upcoming", t("workAdmin.when.upcoming")],
                    ["past", t("workAdmin.when.past")],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={meetingFilter === id ? "default" : "outline"}
                    className="h-8 rounded-full px-3 text-[12px]"
                    onClick={() => setMeetingFilter(id)}
                  >
                    {label}
                  </Button>
                ))}
          </div>
        </div>

        <TabsContent value="tasks" className="mt-4 outline-none">
          <motion.ul
            variants={staggerContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="space-y-2"
          >
            <AnimatePresence initial={false}>
              {filteredTasks.map((task) => {
                const due = taskDueBucket(task.dueDate, task.status);
                const subDone = task.subItems.filter((s) => s.done).length;
                return (
                  <motion.li
                    key={task.id}
                    layout={!reduceMotion}
                    variants={fadeInUp}
                    className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-border"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold leading-snug">
                            {task.title}
                          </p>
                          {due === "overdue" ? (
                            <Badge variant="danger">{t("ops.due.overdue")}</Badge>
                          ) : null}
                        </div>
                        {task.description ? (
                          <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                            {task.description}
                          </p>
                        ) : null}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <Badge variant={PRIORITY_VARIANT[task.priority]}>
                            {t(`ops.priority.${task.priority}`)}
                          </Badge>
                          <Badge variant="secondary">
                            {t(
                              `ops.status${
                                task.status === "todo"
                                  ? "Todo"
                                  : task.status === "in_progress"
                                    ? "InProgress"
                                    : "Completed"
                              }`
                            )}
                          </Badge>
                          {task.tag ? (
                            <Badge variant="outline">{task.tag}</Badge>
                          ) : null}
                          {task.subItems.length > 0 ? (
                            <Badge variant="outline">
                              {subDone}/{task.subItems.length}{" "}
                              {t("workHub.subtasks")}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <EmployeeAvatarStack
                            employees={employeeMap}
                            ids={task.assigneeIds}
                          />
                          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            {task.dueDate
                              ? format(parseISO(task.dueDate), "d MMM yyyy", {
                                  locale: dateLocale,
                                })
                              : t("ops.due.none")}
                            {task.estimateMin > 0 ? (
                              <>
                                <span className="text-border">·</span>
                                {task.estimateMin} {t("workHub.minutes")}
                              </>
                            ) : null}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditTask(task)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("common.edit")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "task",
                              id: task.id,
                              title: task.title,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {filteredTasks.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border/80 px-4 py-14 text-center">
                <ListTodo className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  {t("workAdmin.emptyTasks")}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("workAdmin.emptyTasksHint")}
                </p>
                <Button
                  type="button"
                  className="mt-4"
                  size="sm"
                  onClick={openCreateTask}
                >
                  <Plus className="h-4 w-4" />
                  {t("workAdmin.addTask")}
                </Button>
              </li>
            ) : null}
          </motion.ul>
        </TabsContent>

        <TabsContent value="meetings" className="mt-4 outline-none">
          <motion.ul
            variants={staggerContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="space-y-2"
          >
            <AnimatePresence initial={false}>
              {filteredMeetings.map((meeting) => {
                const when = meetingWhen(meeting.date);
                return (
                  <motion.li
                    key={meeting.id}
                    layout={!reduceMotion}
                    variants={fadeInUp}
                    className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-border"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-snug">
                          {meeting.title}
                        </p>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          {format(parseISO(meeting.date), "EEEE · d MMM", {
                            locale: dateLocale,
                          })}{" "}
                          ·{" "}
                          {formatClockRange(
                            meeting.startTime,
                            meeting.endTime,
                            locale
                          )}
                        </p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {meeting.location}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              when === "today"
                                ? "info"
                                : when === "past"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {t(`workAdmin.when.${when}`)}
                          </Badge>
                          <EmployeeAvatarStack
                            employees={employeeMap}
                            ids={meeting.participantIds}
                          />
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditMeeting(meeting)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("common.edit")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "meeting",
                              id: meeting.id,
                              title: meeting.title,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {filteredMeetings.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border/80 px-4 py-14 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  {t("workAdmin.emptyMeetings")}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("workAdmin.emptyMeetingsHint")}
                </p>
                <Button
                  type="button"
                  className="mt-4"
                  size="sm"
                  onClick={openCreateMeeting}
                >
                  <Plus className="h-4 w-4" />
                  {t("workAdmin.addMeeting")}
                </Button>
              </li>
            ) : null}
          </motion.ul>
        </TabsContent>
      </Tabs>

      {/* Task dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTaskId ? t("workAdmin.editTask") : t("workAdmin.addTask")}
            </DialogTitle>
            <DialogDescription>{t("workAdmin.taskFormDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <Field label={t("workAdmin.fieldTitle")} htmlFor="task-title">
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </Field>
            <Field label={t("common.description")} htmlFor="task-desc">
              <Textarea
                id="task-desc"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("workAdmin.fieldDue")} htmlFor="task-due">
                <Input
                  id="task-due"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                />
              </Field>
              <Field label={t("workAdmin.fieldEstimate")} htmlFor="task-est">
                <Input
                  id="task-est"
                  type="number"
                  min={0}
                  max={480}
                  value={taskForm.estimateMin || ""}
                  placeholder="—"
                  onChange={(e) =>
                    setTaskForm((p) => ({
                      ...p,
                      estimateMin: e.target.value
                        ? Number(e.target.value)
                        : 0,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("workAdmin.fieldPriority")} htmlFor="task-priority">
                <select
                  id="task-priority"
                  className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((p) => ({
                      ...p,
                      priority: e.target.value as TaskPriority,
                    }))
                  }
                >
                  <option value="high">{t("ops.priority.high")}</option>
                  <option value="medium">{t("ops.priority.medium")}</option>
                  <option value="low">{t("ops.priority.low")}</option>
                </select>
              </Field>
              <Field label={t("common.status")} htmlFor="task-status">
                <select
                  id="task-status"
                  className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
                  value={taskForm.status}
                  onChange={(e) =>
                    setTaskForm((p) => ({
                      ...p,
                      status: e.target.value as TaskStatus,
                    }))
                  }
                >
                  <option value="todo">{t("ops.statusTodo")}</option>
                  <option value="in_progress">{t("ops.statusInProgress")}</option>
                  <option value="completed">{t("ops.statusCompleted")}</option>
                </select>
              </Field>
              <Field label={t("workAdmin.fieldTag")} htmlFor="task-tag">
                <Input
                  id="task-tag"
                  value={taskForm.tag}
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, tag: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label={t("workAdmin.fieldRelatedMeeting")} htmlFor="task-meet">
              <select
                id="task-meet"
                className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
                value={taskForm.relatedMeetingId}
                onChange={(e) =>
                  setTaskForm((p) => ({
                    ...p,
                    relatedMeetingId: e.target.value,
                  }))
                }
              >
                <option value="">{t("workAdmin.noRelatedMeeting")}</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} · {m.date}
                  </option>
                ))}
              </select>
            </Field>
            <EmployeeMultiPicker
              employees={employees}
              selectedIds={taskForm.assigneeIds}
              onChange={(assigneeIds) =>
                setTaskForm((p) => ({ ...p, assigneeIds }))
              }
              label={t("workAdmin.fieldAssignees")}
            />
            <Field label={t("workAdmin.fieldSubItems")} htmlFor="task-subs">
              <Textarea
                id="task-subs"
                placeholder={t("workAdmin.subItemsHint")}
                value={taskForm.subItemsText}
                onChange={(e) =>
                  setTaskForm((p) => ({ ...p, subItemsText: e.target.value }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTaskDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void saveTask()}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMeetingId
                ? t("workAdmin.editMeeting")
                : t("workAdmin.addMeeting")}
            </DialogTitle>
            <DialogDescription>
              {t("workAdmin.meetingFormDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <Field label={t("workAdmin.fieldTitle")} htmlFor="meet-title">
              <Input
                id="meet-title"
                value={meetingForm.title}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("workAdmin.fieldDate")} htmlFor="meet-date">
                <Input
                  id="meet-date"
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) =>
                    setMeetingForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </Field>
              <Field label={t("workAdmin.fieldStart")} htmlFor="meet-start">
                <Time12Input
                  id="meet-start"
                  value={meetingForm.startTime}
                  onChange={(startTime) =>
                    setMeetingForm((p) => ({ ...p, startTime }))
                  }
                  aria-label={t("workAdmin.fieldStart")}
                />
              </Field>
              <Field label={t("workAdmin.fieldEnd")} htmlFor="meet-end">
                <Time12Input
                  id="meet-end"
                  value={meetingForm.endTime}
                  onChange={(endTime) =>
                    setMeetingForm((p) => ({ ...p, endTime }))
                  }
                  aria-label={t("workAdmin.fieldEnd")}
                />
              </Field>
            </div>
            <Field label={t("workHub.location")} htmlFor="meet-loc">
              <Input
                id="meet-loc"
                value={meetingForm.location}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, location: e.target.value }))
                }
              />
            </Field>
            <Field label={t("workHub.organizer")} htmlFor="meet-org">
              <select
                id="meet-org"
                className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
                value={meetingForm.organizerId}
                onChange={(e) => {
                  const organizerId = e.target.value;
                  setMeetingForm((p) => ({
                    ...p,
                    organizerId,
                    participantIds: p.participantIds.includes(organizerId)
                      ? p.participantIds
                      : [...p.participantIds, organizerId],
                  }));
                }}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </Field>
            <EmployeeMultiPicker
              employees={employees}
              selectedIds={meetingForm.participantIds}
              onChange={(participantIds) =>
                setMeetingForm((p) => ({ ...p, participantIds }))
              }
              label={t("workAdmin.fieldParticipants")}
            />
            <Field label={t("workHub.agenda")} htmlFor="meet-agenda">
              <Textarea
                id="meet-agenda"
                placeholder={t("workAdmin.agendaHint")}
                value={meetingForm.agendaText}
                onChange={(e) =>
                  setMeetingForm((p) => ({
                    ...p,
                    agendaText: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label={t("workHub.notes")} htmlFor="meet-notes">
              <Textarea
                id="meet-notes"
                value={meetingForm.notes}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </Field>
            <Field label={t("workAdmin.fieldJoinUrl")} htmlFor="meet-url">
              <Input
                id="meet-url"
                type="url"
                placeholder="https://"
                value={meetingForm.joinUrl}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, joinUrl: e.target.value }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMeetingDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void saveMeeting()}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workAdmin.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("workAdmin.confirmDeleteBody", {
                title: deleteTarget?.title ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void confirmDelete()}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.07] px-2.5 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5">
      <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums text-white sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
