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
import Link from "next/link";
import { BidiText } from "@/components/shared/bidi-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import {
  leadsOnDay,
  localDayKey,
  overdueLeads,
  tasksOnDay,
  weekFrom,
} from "@/lib/crm/day-agenda";
import { dateFnsLocale, TIME_12H } from "@/lib/format-time";
import { parseMaybe } from "@/lib/crm/date-range";
import { CRM_UPDATED_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";
import { getCrmLeads } from "@/services/crm/crm-leads.service";
import { getWorkTasks } from "@/services/work/work-tasks.service";
import type { Employee } from "@/types";
import type { CrmFollowUpFilter, CrmLead } from "@/types/crm";
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
  const quiet = !loading && dayLeads.length === 0 && dayTasks.length === 0 && late.length === 0;

  function shiftWeek(delta: number) {
    const next = addDays(anchor, delta * 7);
    setAnchor(next);
    setSelected(next);
  }

  function jumpToday() {
    const today = startOfDay(new Date());
    setAnchor(today);
    setSelected(today);
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
          const count = leadsOnDay(leads, day, now).length + tasksOnDay(tasks, day).length;
          return (
            <button
              key={localDayKey(day)}
              ref={active ? selectedRef : undefined}
              type="button"
              onClick={() => setSelected(day)}
              aria-pressed={active}
              className={cn(
                "flex min-h-[4.75rem] w-[4.35rem] shrink-0 snap-center touch-manipulation flex-col items-center justify-center rounded-2xl border px-1 py-2 transition-colors sm:w-auto sm:min-w-0",
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
                  "mt-1.5 h-1.5 w-1.5 rounded-full",
                  count > 0
                    ? active
                      ? "bg-primary-foreground"
                      : "bg-primary"
                    : "bg-transparent"
                )}
                aria-hidden
              />
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

      {!loading && late.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-amber-500/[0.06]">
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <p className="min-w-0 text-[13px] font-semibold text-amber-800 dark:text-amber-200">
              {t("crm.agenda.overdue")}
            </p>
            <span className="ms-auto font-mono text-[12px] tabular-nums text-amber-800/80 dark:text-amber-200/80">
              {late.length}
            </span>
          </div>
          <ul className="grid gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
            {late.map((lead) => (
              <FollowUpRow
                key={lead.id}
                lead={lead}
                locale={locale}
                owner={ownerName(lead.ownerEmployeeId)}
                actionLabel={t(`crm.nextAction.${lead.nextAction}`)}
                onOpen={() => onOpenLead(lead.id)}
                late
              />
            ))}
          </ul>
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
            count={dayLeads.length}
            icon={<PhoneCall className="h-3.5 w-3.5" aria-hidden />}
          >
            {dayLeads.map((lead) => (
              <FollowUpRow
                key={lead.id}
                lead={lead}
                locale={locale}
                owner={ownerName(lead.ownerEmployeeId)}
                actionLabel={t(`crm.nextAction.${lead.nextAction}`)}
                onOpen={() => onOpenLead(lead.id)}
              />
            ))}
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
  children,
}: {
  title: string;
  empty: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel min-w-0 p-3 sm:p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <p className="min-w-0 text-[13px] font-semibold">{title}</p>
        <span className="ms-auto font-mono text-[12px] tabular-nums text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border/80 px-3 py-4 text-center text-[12px] text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">{children}</ul>
      )}
    </section>
  );
}

function FollowUpRow({
  lead,
  locale,
  owner,
  actionLabel,
  onOpen,
  late = false,
}: {
  lead: CrmLead;
  locale: string;
  owner?: string;
  actionLabel: string;
  onOpen: () => void;
  late?: boolean;
}) {
  const due = parseMaybe(lead.nextFollowUpAt);
  const time = due ? format(due, TIME_12H, { locale: dateFnsLocale(locale) }) : "—";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[3.25rem] w-full items-center gap-2.5 rounded-xl border border-border/70 bg-card px-2.5 py-2.5 text-start transition-colors active:bg-muted/60 sm:hover:bg-muted/40"
      >
        <span
          dir="ltr"
          className={cn(
            "flex h-11 w-[4.4rem] shrink-0 items-center justify-center rounded-xl px-1 text-center font-mono text-[11px] font-semibold leading-tight tabular-nums",
            late
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
              : "bg-primary/10 text-primary"
          )}
        >
          {time}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">
            <BidiText text={lead.name} />
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {actionLabel}
            {owner ? ` · ${owner}` : ""}
          </span>
          {lead.companyName ? (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
              <BidiText text={lead.companyName} />
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function TaskRow({ task, label }: { task: WorkTask; label: string }) {
  return (
    <li>
      <Link
        href="/tasks"
        className="flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border border-border/70 bg-card px-2.5 py-2.5 transition-colors active:bg-muted/60 sm:hover:bg-muted/40"
      >
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            task.priority === "high" && "bg-rose-500",
            task.priority === "medium" && "bg-amber-500",
            task.priority === "low" && "bg-sky-500",
            task.status === "completed" && "bg-emerald-500"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[13px] font-semibold",
              task.status === "completed" && "text-muted-foreground line-through"
            )}
          >
            <BidiText text={task.title} />
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{label}</span>
        </span>
      </Link>
    </li>
  );
}
