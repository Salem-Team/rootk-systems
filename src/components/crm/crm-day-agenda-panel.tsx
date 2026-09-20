"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  PhoneCall,
} from "lucide-react";
import { ACTION_TONE, ActionGroups, FilterChip, TaskRow } from "@/components/crm/crm-agenda-action-groups";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import {
  agendaAction,
  groupLeadsByAction,
  leadsOnDay,
  localDayKey,
  overdueLeads,
  tasksOnDay,
  weekFrom,
} from "@/lib/crm/day-agenda";
import { dateFnsLocale } from "@/lib/format-time";
import { CRM_UPDATED_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";
import { getCrmLeads } from "@/services/crm/crm-leads.service";
import { getWorkTasks } from "@/services/work/work-tasks.service";
import type { Employee } from "@/types";
import type { CrmFollowUpFilter, CrmLead, CrmNextAction } from "@/types/crm";
import type { WorkTask } from "@/types/work";

interface CrmDayAgendaPanelProps {
  employees: Employee[];
  onOpenLead: (leadId: string) => void;
}

async function loadFollowUpBucket(followUp: CrmFollowUpFilter): Promise<CrmLead[]> {
  const items: CrmLead[] = [];
  const pageSize = 100;
  for (let page = 1; page <= 4; page += 1) {
    const res = await getCrmLeads({
      status: "active",
      followUp,
      page,
      pageSize,
      sort: "nextFollowUpAt",
      order: "asc",
    });
    const batch = res.data?.items ?? [];
    items.push(...batch);
    if (batch.length < pageSize || items.length >= (res.data?.total ?? 0)) break;
  }
  return items;
}

/** One place for every follow-up time and every task due that day. */
export function CrmDayAgendaPanel({
  employees,
  onOpenLead,
}: CrmDayAgendaPanelProps) {
  const { t, locale } = useTranslation();
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<CrmNextAction | "all">("all");
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const dfLocale = dateFnsLocale(locale);
  const now = new Date();
  const days = useMemo(() => weekFrom(anchor), [anchor]);
  const ownerName = useMemo(() => {
    const map = new Map(employees.map((employee) => [employee.id, employee.name]));
    return (id: string | null | undefined) => (id ? map.get(id) : undefined);
  }, [employees]);

  const load = useCallback(async () => {
    setLoading(true);
    const [today, upcoming, overdue, taskRes] = await Promise.all([
      loadFollowUpBucket("today"),
      loadFollowUpBucket("upcoming"),
      loadFollowUpBucket("overdue"),
      getWorkTasks(),
    ]);
    const byId = new Map<string, CrmLead>();
    for (const lead of [...overdue, ...today, ...upcoming]) byId.set(lead.id, lead);
    setLeads([...byId.values()]);
    setTasks(taskRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener(CRM_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(CRM_UPDATED_EVENT, onUpdate);
  }, [load]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [selected, anchor]);

  const dayLeads = leadsOnDay(leads, selected, now);
  const dayTasks = tasksOnDay(tasks, selected);
  const late = isSameDay(selected, now) ? overdueLeads(leads, now) : [];
  const visibleLeads =
    actionFilter === "all"
      ? dayLeads
      : dayLeads.filter((lead) => agendaAction(lead) === actionFilter);
  const visibleLate =
    actionFilter === "all"
      ? late
      : late.filter((lead) => agendaAction(lead) === actionFilter);
  const actionChoices = groupLeadsByAction([...dayLeads, ...late]);
  const quiet =
    !loading && dayLeads.length === 0 && dayTasks.length === 0 && late.length === 0;

  function shiftWeek(delta: number) {
    const next = addDays(anchor, delta * 7);
    setAnchor(next);
    setSelected(next);
  }

  function jumpToday() {
    const today = startOfDay(new Date());
    setAnchor(today);
    setSelected(today);
    setActionFilter("all");
  }

  return (
    <section className="grid min-w-0 gap-3 sm:gap-4">
      <header className="surface-panel overflow-hidden">
        <div className="flex items-start gap-3 px-3.5 py-3.5 sm:px-5 sm:py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight sm:text-base">
              {t("crm.agenda.title")}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
              {t("crm.agenda.description")}
            </p>
            <p className="mt-1.5 text-[13px] font-semibold text-foreground">
              {format(selected, "EEEE d MMMM", { locale: dfLocale })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border/70 border-t border-border/70 rtl:divide-x-reverse">
          <Metric label={t("crm.agenda.followUps")} value={String(dayLeads.length)} />
          <Metric label={t("crm.agenda.tasks")} value={String(dayTasks.length)} />
          <Metric
            label={t("crm.agenda.overdueShort")}
            value={String(late.length)}
            warn={late.length > 0}
          />
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={() => shiftWeek(-1)}
          aria-label={t("crm.agenda.prev")}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <Button
          type="button"
          variant={isSameDay(selected, now) ? "default" : "outline"}
          className="h-11 min-w-0 flex-1 rounded-xl px-3 text-[13px]"
          onClick={jumpToday}
        >
          {t("crm.agenda.today")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={() => shiftWeek(1)}
          aria-label={t("crm.agenda.next")}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const active = isSameDay(day, selected);
          const today = isSameDay(day, now);
          const count =
            leadsOnDay(leads, day, now).length +
            tasksOnDay(tasks, day).length +
            (isSameDay(day, now) ? overdueLeads(leads, now).length : 0);
          return (
            <button
              key={localDayKey(day)}
              ref={active ? selectedRef : undefined}
              type="button"
              onClick={() => {
                setSelected(day);
                setActionFilter("all");
              }}
              aria-pressed={active}
              className={cn(
                "flex min-h-[4.75rem] w-[4.75rem] shrink-0 snap-center touch-manipulation flex-col items-center justify-center rounded-2xl border px-1 py-2 transition-colors sm:w-auto sm:min-w-0",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-card hover:bg-muted/40",
                today && !active && "border-primary/35"
              )}
            >
              <span className="max-w-full truncate text-[10px] font-medium opacity-80 sm:text-[11px]">
                {format(day, "EEE", { locale: dfLocale })}
              </span>
              <span className="text-[1.15rem] font-semibold leading-none tabular-nums">
                {format(day, "d")}
              </span>
              <span
                className={cn(
                  "mt-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                  count === 0 && "opacity-0",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : null}

      {!loading && (dayLeads.length > 0 || late.length > 0) ? (
        <div className="relative min-w-0">
          <div className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            <FilterChip
              active={actionFilter === "all"}
              count={dayLeads.length + late.length}
              onClick={() => setActionFilter("all")}
            >
              {t("crm.agenda.all")}
            </FilterChip>
            {actionChoices.map((group) => {
              const tone = ACTION_TONE[group.action];
              const Icon = tone.icon;
              return (
                <FilterChip
                  key={group.action}
                  active={actionFilter === group.action}
                  count={group.leads.length}
                  activeClassName={tone.solid}
                  onClick={() => setActionFilter(group.action)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t(`crm.nextAction.${group.action}`)}
                </FilterChip>
              );
            })}
          </div>
        </div>
      ) : null}

      {!loading && visibleLate.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-amber-500/[0.06]">
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <p className="min-w-0 text-[13px] font-semibold text-amber-800 dark:text-amber-200">
              {t("crm.agenda.overdue")}
            </p>
            <span className="ms-auto font-mono text-[12px] tabular-nums text-amber-800/80 dark:text-amber-200/80">
              {visibleLate.length}
            </span>
          </div>
          <div className="grid gap-2.5 px-2 pb-2 sm:px-2.5 sm:pb-2.5">
            <ActionGroups
              leads={visibleLate}
              locale={locale}
              ownerName={ownerName}
              onOpenLead={onOpenLead}
              late
              showHeaders={actionFilter === "all"}
            />
          </div>
        </section>
      ) : null}

      {quiet ? (
        <div className="surface-panel px-4 py-8 text-center">
          <p className="text-[13px] font-medium text-muted-foreground">{t("crm.agenda.emptyDay")}</p>
        </div>
      ) : null}

      {!loading && !quiet ? (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:items-start">
          <DayColumn
            title={t("crm.agenda.followUps")}
            empty={t("crm.agenda.emptyFollowUps")}
            count={visibleLeads.length}
            icon={<PhoneCall className="h-3.5 w-3.5" aria-hidden />}
            plain
          >
            <ActionGroups
              leads={visibleLeads}
              locale={locale}
              ownerName={ownerName}
              onOpenLead={onOpenLead}
              showHeaders={actionFilter === "all"}
            />
          </DayColumn>
          <DayColumn
            title={t("crm.agenda.tasks")}
            empty={t("crm.agenda.emptyTasks")}
            count={dayTasks.length}
            icon={<ListTodo className="h-3.5 w-3.5" aria-hidden />}
          >
            {dayTasks.map((task) => (
              <TaskRow key={task.id} task={task} label={taskLabel(task, t)} />
            ))}
          </DayColumn>
        </div>
      ) : null}
    </section>
  );
}

function taskLabel(
  task: WorkTask,
  t: (path: "crm.agenda.taskDone" | "crm.agenda.taskInProgress" | "crm.agenda.taskTodo") => string
): string {
  if (task.status === "completed") return t("crm.agenda.taskDone");
  if (task.status === "in_progress") return t("crm.agenda.taskInProgress");
  return t("crm.agenda.taskTodo");
}

function Metric({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="min-w-0 px-2 py-2.5 text-center sm:px-3 sm:py-3">
      <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-[11px]">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums leading-none sm:text-xl",
          warn && "text-amber-700 dark:text-amber-300"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DayColumn({
  title,
  empty,
  count,
  icon,
  plain = false,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  icon: ReactNode;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-w-0", !plain && "surface-panel p-3 sm:p-3.5")}>
      <div className="flex min-h-11 items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <p className="min-w-0 text-sm font-semibold">{title}</p>
        <span className="ms-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-border/80 px-3 py-5 text-center text-[13px] text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className={cn("mt-2", plain ? "grid gap-2.5" : "grid gap-2")}>{children}</div>
      )}
    </section>
  );
}
