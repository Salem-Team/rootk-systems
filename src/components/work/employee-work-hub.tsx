"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO, type Locale } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
  ListTodo,
  Loader2,
  MapPin,
  Pencil,
  Sparkles,
  Target,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaChip } from "@/components/shared/meta-chip";
import {
  EmployeeComposerTriggers,
  EmployeeWorkComposer,
  OriginBadge,
  removePersonalWork,
} from "@/components/work/employee-work-composer";
import {
  buildOpsChecklist,
  buildOpsGoals,
} from "@/components/operations/operations-mock-data";
import { getEmployees } from "@/services/employees.service";
import {
  getMyWorkMeetings,
  getMyWorkTasks,
  toggleWorkTaskSubItem,
  updateWorkTaskStatus,
} from "@/services/work.service";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { demoNow } from "@/lib/mock-date";
import {
  employeeOwnsPersonalMeeting,
  employeeOwnsPersonalTask,
  meetingWhen,
  taskDueBucket,
} from "@/lib/work-utils";
import { fadeInUp, snappySpring, staggerContainer, staggerFast } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";
import type { TranslationPath } from "@/i18n";

const PRIORITY_VARIANT = {
  high: "danger",
  medium: "warning",
  low: "info",
} as const;

type WorkTab = "tasks" | "meetings" | "day";
type OriginFilter = "all" | "assigned" | "personal";
type ComposerMode = "task" | "meeting" | null;

function statusLabelKey(status: TaskStatus): TranslationPath {
  if (status === "todo") return "ops.statusTodo";
  if (status === "in_progress") return "ops.statusInProgress";
  return "ops.statusCompleted";
}

export function EmployeeWorkHub() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const user = useSessionStore((s) => s.user);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const searchParams = useSearchParams();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [meetings, setMeetings] = useState<WorkMeeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [checklist, setChecklist] = useState(buildOpsChecklist);
  const goals = useMemo(() => buildOpsGoals(), []);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<WorkTab>("tasks");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<WorkMeeting | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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
      setMobileDetailOpen(true);
    }
    if (meetingId) {
      setTab("meetings");
      setSelectedMeetingId(meetingId);
      setMobileDetailOpen(true);
    }
  }, [searchParams]);

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

  async function cycleTaskStatus(id: string) {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    const order: TaskStatus[] = ["todo", "in_progress", "completed"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    setTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: next } : x))
    );
    const res = await updateWorkTaskStatus(id, next);
    if (!res.success) await reload();
  }

  async function toggleSubItem(taskId: string, subId: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id !== taskId
          ? task
          : {
              ...task,
              subItems: task.subItems.map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s
              ),
            }
      )
    );
    const res = await toggleWorkTaskSubItem(taskId, subId);
    if (!res.success) await reload();
  }

  function selectTask(id: string) {
    setSelectedTaskId(id);
    setMobileDetailOpen(true);
  }

  function selectMeeting(id: string) {
    setSelectedMeetingId(id);
    setMobileDetailOpen(true);
  }

  function nameOf(id: string) {
    return employeeMap.get(id)?.name ?? id;
  }

  function openCreateTask() {
    setEditingTask(null);
    setComposerMode("task");
  }

  function openCreateMeeting() {
    setEditingMeeting(null);
    setComposerMode("meeting");
  }

  function openEditTask(task: WorkTask) {
    if (!employeeOwnsPersonalTask(task, workEmployeeId, user?.id)) return;
    setEditingMeeting(null);
    setEditingTask(task);
    setComposerMode("task");
  }

  function openEditMeeting(meeting: WorkMeeting) {
    if (!employeeOwnsPersonalMeeting(meeting, workEmployeeId, user?.id)) return;
    setEditingTask(null);
    setEditingMeeting(meeting);
    setComposerMode("meeting");
  }

  async function handleDeletePersonal(
    kind: "task" | "meeting",
    id: string,
    title: string
  ) {
    const res = await removePersonalWork(kind, id);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    if (kind === "task" && selectedTaskId === id) setSelectedTaskId(null);
    if (kind === "meeting" && selectedMeetingId === id) {
      setSelectedMeetingId(null);
    }
    await reload();
    toast.success(
      kind === "task" ? t("workHub.taskDeleted") : t("workHub.meetingDeleted")
    );
    void title;
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
        variants={staggerFast}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="relative overflow-hidden rounded-[1.5rem] border border-primary/20 bg-[linear-gradient(155deg,#061c4a_0%,#082868_48%,#0c3a7a_100%)] p-5 text-primary-foreground shadow-[var(--shadow-card-hover)] sm:p-7"
        aria-label={t("workHub.heroLabel")}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "radial-gradient(circle at 88% 10%, rgba(255,255,255,0.18), transparent 32%), radial-gradient(circle at 10% 90%, rgba(56,189,248,0.18), transparent 42%)",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {format(demoNow(), "EEEE · d MMM", { locale: dateLocale })}
            </p>
            <h1 className="font-display mt-2 text-[1.7rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
              {t("workHub.heroTitle", { name: t(user.firstNameKey) })}
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/72">
              {t("workHub.heroDesc")}
            </p>
            <EmployeeComposerTriggers
              className="mt-4"
              onAddTask={openCreateTask}
              onAddMeeting={openCreateMeeting}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[28rem]">
            <HeroStat
              icon={<ListTodo className="h-3.5 w-3.5" />}
              label={t("workHub.statOpen")}
              value={String(openTasks.length)}
            />
            <HeroStat
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label={t("workHub.statMeetings")}
              value={String(todayMeetings.length)}
            />
            <HeroStat
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label={t("workHub.statOverdue")}
              value={String(overdue.length)}
            />
            <HeroStat
              icon={<ListChecks className="h-3.5 w-3.5" />}
              label={t("workHub.statChecklist")}
              value={`${checklistPct}%`}
            />
          </div>
        </div>
      </motion.section>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as WorkTab)}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-muted/60 p-1.5 sm:w-auto sm:inline-grid">
          <TabsTrigger value="tasks" className="rounded-xl px-4 py-2.5 text-[13px]">
            <ListTodo className="me-1.5 h-3.5 w-3.5" aria-hidden />
            {t("workHub.tabTasks")}
          </TabsTrigger>
          <TabsTrigger
            value="meetings"
            className="rounded-xl px-4 py-2.5 text-[13px]"
          >
            <CalendarDays className="me-1.5 h-3.5 w-3.5" aria-hidden />
            {t("workHub.tabMeetings")}
          </TabsTrigger>
          <TabsTrigger value="day" className="rounded-xl px-4 py-2.5 text-[13px]">
            <Target className="me-1.5 h-3.5 w-3.5" aria-hidden />
            {t("workHub.tabDay")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-0 outline-none">
          <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "assigned", "personal"] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={originFilter === f ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-[12px]"
                  onClick={() => setOriginFilter(f)}
                >
                  {f === "all"
                    ? t("common.all")
                    : f === "assigned"
                      ? t("workHub.originAssigned")
                      : t("workHub.originPersonal")}
                  <span className="ms-1.5 font-mono text-[10px] opacity-70">
                    {f === "all"
                      ? tasks.length
                      : tasks.filter((x) => (x.origin ?? "assigned") === f)
                          .length}
                  </span>
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "todo", "in_progress", "completed"] as const).map(
                (f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant={filter === f ? "secondary" : "ghost"}
                    className="h-8 rounded-full px-3 text-[12px]"
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? t("common.status") : t(statusLabelKey(f))}
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <motion.ul
              variants={staggerContainer}
              initial={false}
              animate="visible"
              className="space-y-2 lg:col-span-5"
            >
              <AnimatePresence initial={false}>
                {visibleTasks.map((task) => {
                  const active = selectedTask?.id === task.id;
                  const subDone = task.subItems.filter((s) => s.done).length;
                  const due = taskDueBucket(task.dueDate, task.status);
                  return (
                    <motion.li
                      key={task.id}
                      variants={fadeInUp}
                      layout={!reduceMotion}
                    >
                      <button
                        type="button"
                        onClick={() => selectTask(task.id)}
                        className={cn(
                          "list-row w-full px-3.5 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                          active && "list-row-active"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-0.5",
                              task.status === "completed"
                                ? "text-emerald-600"
                                : task.status === "in_progress"
                                  ? "text-sky-600"
                                  : "text-muted-foreground"
                            )}
                          >
                            {task.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block text-[14px] font-semibold leading-snug",
                                task.status === "completed" &&
                                  "text-muted-foreground line-through"
                              )}
                            >
                              {task.title}
                            </span>
                            <span className="mt-1.5 flex flex-wrap gap-1">
                              <OriginBadge origin={task.origin} />
                              <Badge
                                variant={PRIORITY_VARIANT[task.priority]}
                                className="h-5"
                              >
                                {t(`ops.priority.${task.priority}`)}
                              </Badge>
                              <Badge
                                variant={
                                  due === "overdue" ? "danger" : "outline"
                                }
                                className="h-5"
                              >
                                {t(`ops.due.${due}`)}
                              </Badge>
                              {task.tag ? (
                                <Badge variant="secondary" className="h-5">
                                  {task.tag}
                                </Badge>
                              ) : null}
                            </span>
                            <span className="mt-2 block text-[11px] text-muted-foreground">
                              {t("workHub.subProgress", {
                                done: subDone,
                                total: task.subItems.length,
                              })}
                              {task.estimateMin > 0
                                ? ` · ${task.estimateMin} ${t("workHub.minutes")}`
                                : ""}
                            </span>
                          </span>
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
              {visibleTasks.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("ops.noTasks")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4"
                    onClick={openCreateTask}
                  >
                    {t("workHub.addPersonalTask")}
                  </Button>
                </li>
              ) : null}
            </motion.ul>

            <div className="hidden lg:col-span-7 lg:block">
              {selectedTask ? (
                <TaskDetailCard
                  task={selectedTask}
                  meetings={meetings}
                  nameOf={nameOf}
                  onCycleStatus={() => void cycleTaskStatus(selectedTask.id)}
                  onToggleSub={(subId) =>
                    void toggleSubItem(selectedTask.id, subId)
                  }
                  onOpenMeeting={(id) => {
                    setTab("meetings");
                    selectMeeting(id);
                  }}
                  onEdit={
                    employeeOwnsPersonalTask(
                      selectedTask,
                      workEmployeeId,
                      user?.id
                    )
                      ? () => openEditTask(selectedTask)
                      : undefined
                  }
                  onDelete={
                    employeeOwnsPersonalTask(
                      selectedTask,
                      workEmployeeId,
                      user?.id
                    )
                      ? () =>
                          void handleDeletePersonal(
                            "task",
                            selectedTask.id,
                            selectedTask.title
                          )
                      : undefined
                  }
                />
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="mt-0 outline-none">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "assigned", "personal"] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={originFilter === f ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-[12px]"
                  onClick={() => setOriginFilter(f)}
                >
                  {f === "all"
                    ? t("common.all")
                    : f === "assigned"
                      ? t("workHub.originAssigned")
                      : t("workHub.originPersonal")}
                </Button>
              ))}
            </div>
            <Button type="button" size="sm" onClick={openCreateMeeting}>
              {t("workHub.addPersonalMeeting")}
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <MeetingList
                title={t("ops.meetingsToday")}
                items={filteredTodayMeetings}
                activeId={selectedMeeting?.id}
                onSelect={selectMeeting}
                dateLocale={dateLocale}
                onCreate={openCreateMeeting}
              />
              <MeetingList
                title={t("ops.meetingsUpcoming")}
                items={filteredUpcomingMeetings}
                activeId={selectedMeeting?.id}
                onSelect={selectMeeting}
                dateLocale={dateLocale}
              />
            </div>
            <div className="hidden lg:col-span-7 lg:block">
              {selectedMeeting ? (
                <MeetingDetailCard
                  meeting={selectedMeeting}
                  nameOf={nameOf}
                  dateLocale={dateLocale}
                  onEdit={
                    employeeOwnsPersonalMeeting(
                      selectedMeeting,
                      workEmployeeId,
                      user?.id
                    )
                      ? () => openEditMeeting(selectedMeeting)
                      : undefined
                  }
                  onDelete={
                    employeeOwnsPersonalMeeting(
                      selectedMeeting,
                      workEmployeeId,
                      user?.id
                    )
                      ? () =>
                          void handleDeletePersonal(
                            "meeting",
                            selectedMeeting.id,
                            selectedMeeting.title
                          )
                      : undefined
                  }
                />
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="day" className="mt-0 outline-none">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold">
                    {t("ops.checklistTitle")}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {t("ops.checklistProgress", {
                      done: checklistDone,
                      total: checklist.length,
                    })}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {checklistPct}%
                </span>
              </div>
              <Progress value={checklistPct} className="mb-4 h-1.5" />
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setChecklist((prev) =>
                          prev.map((x) =>
                            x.id === item.id ? { ...x, done: !x.done } : x
                          )
                        )
                      }
                      className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2.5 text-start text-sm hover:bg-muted/40"
                      aria-pressed={item.done}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          item.done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        )}
                      >
                        {item.done ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span
                        className={cn(
                          item.done && "text-muted-foreground line-through"
                        )}
                      >
                        {t(item.labelKey)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
              <div className="mb-4">
                <h2 className="text-[15px] font-semibold">{t("ops.goalsTitle")}</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {t("ops.goalsDesc")}
                </p>
              </div>
              <ul className="space-y-4">
                {goals.map((g) => (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{t(g.labelKey)}</span>
                      <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                        {g.progress}%
                      </span>
                    </div>
                    <Progress value={g.progress} className="h-1.5" />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent className="gap-0 p-0 sm:max-w-md lg:hidden">
          <SheetHeader className="border-b border-border/60 px-4 py-4 text-start">
            <SheetTitle>
              {tab === "meetings"
                ? selectedMeeting?.title ?? t("workHub.tabMeetings")
                : selectedTask?.title ?? t("workHub.tabTasks")}
            </SheetTitle>
            <SheetDescription>
              {tab === "meetings"
                ? t("workHub.meetingDetailDesc")
                : t("workHub.taskDetailDesc")}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100dvh-5.5rem)]">
            <div className="p-4 pb-8">
              {tab === "meetings" && selectedMeeting ? (
                <MeetingDetailCard
                  meeting={selectedMeeting}
                  nameOf={nameOf}
                  dateLocale={dateLocale}
                  embedded
                  onEdit={
                    employeeOwnsPersonalMeeting(
                      selectedMeeting,
                      workEmployeeId,
                      user?.id
                    )
                      ? () => openEditMeeting(selectedMeeting)
                      : undefined
                  }
                  onDelete={
                    employeeOwnsPersonalMeeting(
                      selectedMeeting,
                      workEmployeeId,
                      user?.id
                    )
                      ? () =>
                          void handleDeletePersonal(
                            "meeting",
                            selectedMeeting.id,
                            selectedMeeting.title
                          )
                      : undefined
                  }
                />
              ) : null}
              {tab !== "meetings" && selectedTask ? (
                <TaskDetailCard
                  task={selectedTask}
                  meetings={meetings}
                  nameOf={nameOf}
                  embedded
                  onCycleStatus={() => void cycleTaskStatus(selectedTask.id)}
                  onToggleSub={(subId) =>
                    void toggleSubItem(selectedTask.id, subId)
                  }
                  onOpenMeeting={(id) => {
                    setTab("meetings");
                    selectMeeting(id);
                  }}
                  onEdit={
                    employeeOwnsPersonalTask(
                      selectedTask,
                      workEmployeeId,
                      user?.id
                    )
                      ? () => openEditTask(selectedTask)
                      : undefined
                  }
                  onDelete={
                    employeeOwnsPersonalTask(
                      selectedTask,
                      workEmployeeId,
                      user?.id
                    )
                      ? () =>
                          void handleDeletePersonal(
                            "task",
                            selectedTask.id,
                            selectedTask.title
                          )
                      : undefined
                  }
                />
              ) : null}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <EmployeeWorkComposer
        selfId={workEmployeeId}
        employees={employees}
        mode={composerMode}
        onModeChange={(m) => {
          setComposerMode(m);
          if (!m) {
            setEditingTask(null);
            setEditingMeeting(null);
          }
        }}
        editingTask={editingTask}
        editingMeeting={editingMeeting}
        onSaved={reload}
      />
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

function MeetingList({
  title,
  items,
  activeId,
  onSelect,
  dateLocale,
  onCreate,
}: {
  title: string;
  items: WorkMeeting[];
  activeId?: string;
  onSelect: (id: string) => void;
  dateLocale: Locale;
  onCreate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section>
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {items.length}
      </p>
      <motion.ul
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="space-y-2"
      >
        {items.map((m) => {
          const active = activeId === m.id;
          return (
            <motion.li key={m.id} variants={fadeInUp}>
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                className={cn(
                  "list-row w-full px-3.5 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  active && "list-row-active"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold leading-snug">
                    {m.title}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    {m.startTime}–{m.endTime}
                  </span>
                </div>
                <div className="mt-1.5">
                  <OriginBadge origin={m.origin} />
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {m.location}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {format(parseISO(m.date), "d MMM", { locale: dateLocale })} ·{" "}
                  {m.participantIds.length} {t("workHub.people")}
                </p>
              </button>
            </motion.li>
          );
        })}
        {items.length === 0 ? (
          <li className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <p>{t("workHub.noMeetings")}</p>
            {onCreate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={onCreate}
              >
                {t("workHub.addPersonalMeeting")}
              </Button>
            ) : null}
          </li>
        ) : null}
      </motion.ul>
    </section>
  );
}

function TaskDetailCard({
  task,
  meetings,
  nameOf,
  embedded,
  onCycleStatus,
  onToggleSub,
  onOpenMeeting,
  onEdit,
  onDelete,
}: {
  task: WorkTask;
  meetings: WorkMeeting[];
  nameOf: (id: string) => string;
  embedded?: boolean;
  onCycleStatus: () => void;
  onToggleSub: (subId: string) => void;
  onOpenMeeting: (id: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const related = meetings.find((m) => m.id === task.relatedMeetingId);
  const subDone = task.subItems.filter((s) => s.done).length;
  const subPct = Math.round((subDone / Math.max(task.subItems.length, 1)) * 100);
  const due = taskDueBucket(task.dueDate, task.status);
  const ownerLabel = task.assigneeIds.map(nameOf).join(", ");

  return (
    <motion.article
      key={task.id}
      initial={embedded ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={snappySpring}
      className={cn(
        !embedded &&
          "rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("workHub.taskDetail")}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{task.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {onEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={onCycleStatus}>
            {t("ops.cycleTaskStatus")}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <OriginBadge origin={task.origin} />
        <Badge variant={PRIORITY_VARIANT[task.priority]}>
          {t(`ops.priority.${task.priority}`)}
        </Badge>
        <Badge variant={due === "overdue" ? "danger" : "outline"}>
          {t(`ops.due.${due}`)}
        </Badge>
        <Badge variant="secondary">{t(statusLabelKey(task.status))}</Badge>
        {task.tag ? <Badge variant="outline">{task.tag}</Badge> : null}
      </div>

      {task.description ? (
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <MetaChip label={t("workHub.owner")} value={ownerLabel || "—"} />
        <MetaChip
          label={t("workHub.estimate")}
          value={
            task.estimateMin > 0
              ? `${task.estimateMin} ${t("workHub.minutes")}`
              : "—"
          }
        />
        <MetaChip
          label={t("common.status")}
          value={t(statusLabelKey(task.status))}
        />
      </div>

      {task.subItems.length > 0 ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">{t("workHub.subtasks")}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              {subDone}/{task.subItems.length} · {subPct}%
            </span>
          </div>
          <Progress value={subPct} className="mb-3 h-1.5" />
          <ul className="space-y-2">
            {task.subItems.map((sub) => (
              <li key={sub.id}>
                <button
                  type="button"
                  onClick={() => onToggleSub(sub.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2 text-start text-sm hover:bg-muted/40"
                  aria-pressed={sub.done}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      sub.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {sub.done ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span
                    className={cn(sub.done && "text-muted-foreground line-through")}
                  >
                    {sub.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {related ? (
        <button
          type="button"
          onClick={() => onOpenMeeting(related.id)}
          className="mt-5 flex w-full items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3.5 py-3 text-start transition-colors hover:bg-sky-500/[0.1]"
        >
          <Video className="mt-0.5 h-4 w-4 text-sky-700 dark:text-sky-300" />
          <span>
            <span className="block text-[12px] font-semibold text-sky-800 dark:text-sky-200">
              {t("workHub.relatedMeeting")}
            </span>
            <span className="mt-0.5 block text-sm font-medium">
              {related.title}
            </span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              {related.startTime}–{related.endTime} · {related.location}
            </span>
          </span>
        </button>
      ) : null}
    </motion.article>
  );
}

function MeetingDetailCard({
  meeting,
  nameOf,
  dateLocale,
  embedded,
  onEdit,
  onDelete,
}: {
  meeting: WorkMeeting;
  nameOf: (id: string) => string;
  dateLocale: Locale;
  embedded?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.article
      key={meeting.id}
      initial={embedded ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={snappySpring}
      className={cn(
        !embedded &&
          "rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("workHub.meetingDetail")}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            {meeting.title}
          </h2>
          <div className="mt-2">
            <OriginBadge origin={meeting.origin} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MetaChip
          label={t("workHub.when")}
          value={`${format(parseISO(meeting.date), "EEEE · d MMM", {
            locale: dateLocale,
          })} · ${meeting.startTime}–${meeting.endTime}`}
        />
        <MetaChip label={t("workHub.location")} value={meeting.location} />
        <MetaChip
          label={t("workHub.organizer")}
          value={nameOf(meeting.organizerId)}
        />
        <MetaChip
          label={t("workHub.people")}
          value={String(meeting.participantIds.length)}
        />
      </div>

      <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {meeting.joinUrl ? t("workHub.joinOnline") : t("workHub.joinOnsite")}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {meeting.joinUrl || t("workHub.joinHintBody")}
        </p>
      </div>

      {meeting.agenda.length > 0 ? (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold">{t("workHub.agenda")}</h3>
          <ol className="space-y-2">
            {meeting.agenda.map((item, i) => (
              <li
                key={`${meeting.id}-a-${i}`}
                className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-sm"
              >
                <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <Users className="h-3.5 w-3.5" />
          {t("workHub.participants")}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {meeting.participantIds.map((id) => (
            <Badge key={id} variant="secondary" className="h-7 rounded-full px-3">
              {nameOf(id)}
            </Badge>
          ))}
        </div>
      </div>

      {meeting.notes ? (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold">{t("workHub.notes")}</h3>
          <p className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
            {meeting.notes}
          </p>
        </div>
      ) : null}
    </motion.article>
  );
}
