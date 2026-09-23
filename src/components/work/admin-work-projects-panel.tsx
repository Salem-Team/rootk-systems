"use client";

import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { FolderKanban, Plus, Search } from "lucide-react";
import { EmployeeAvatarStack } from "@/components/work/employee-avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import { summarizePhases } from "@/lib/work-project";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { ProjectStatus, WorkProject } from "@/types/work-project";
import type { ProjectStatusFilter } from "@/components/work/use-admin-work-projects";

const STATUS_VARIANT = {
  planning: "info",
  active: "default",
  on_hold: "warning",
  completed: "success",
} as const;

const STATUS_KEY: Record<ProjectStatus, TranslationPath> = {
  planning: "workAdmin.projects.statusPlanning",
  active: "workAdmin.projects.statusActive",
  on_hold: "workAdmin.projects.statusOnHold",
  completed: "workAdmin.projects.statusCompleted",
};

function plannedTime(
  minutes: number,
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string
) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) {
    return t("workDuration.hoursMinutes", { hours, minutes: rest });
  }
  if (hours) return t("workDuration.hours", { hours });
  return t("workDuration.minutes", { minutes: rest });
}

function formatRange(
  start: string,
  end: string,
  locale: typeof arLocale,
  empty: string
) {
  const fmt = (value: string) => {
    try {
      return format(parseISO(value), "d MMM yyyy", { locale });
    } catch {
      return value;
    }
  };
  if (!start && !end) return empty;
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end);
}

export function AdminWorkProjectsPanel({
  projects,
  employees,
  loading,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  onOpen,
  onCreate,
}: {
  projects: WorkProject[];
  employees: Employee[];
  loading: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: ProjectStatusFilter;
  setStatusFilter: (value: ProjectStatusFilter) => void;
  onOpen: (project: WorkProject) => void;
  onCreate: () => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const chips: ProjectStatusFilter[] = [
    "all",
    "planning",
    "active",
    "on_hold",
    "completed",
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("workAdmin.projects.search")}
          className="h-11 rounded-xl ps-9 sm:h-10"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <Button
            key={chip}
            type="button"
            size="sm"
            variant={statusFilter === chip ? "default" : "outline"}
            className="h-9 shrink-0 rounded-full px-3.5 text-[12px] font-semibold"
            onClick={() => setStatusFilter(chip)}
          >
            {chip === "all"
              ? t("workAdmin.projects.filterAll")
              : t(STATUS_KEY[chip])}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-2xl bg-muted" />
          <div className="h-44 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FolderKanban className="h-5 w-5" />
          </span>
          <p className="font-display text-lg font-semibold">
            {t("workAdmin.projects.emptyTitle")}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("workAdmin.projects.emptyHint")}
          </p>
          <Button type="button" className="mt-4 h-11 rounded-xl" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {t("workAdmin.addProject")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => {
            const summary = summarizePhases(project.phases);
            const lead = employeeMap.get(project.leadId);
            const time = plannedTime(summary.minutes, t);
            const range = formatRange(
              project.startDate,
              project.endDate,
              dateLocale,
              ""
            );
            const when = [range, time].filter(Boolean).join(" · ");
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onOpen(project)}
                className="rounded-2xl border border-border/70 bg-card p-4 text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={STATUS_VARIANT[project.status]}>
                    {t(STATUS_KEY[project.status])}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {summary.pct}%
                  </span>
                </div>
                <h3 className="font-display mt-3 text-[1.05rem] font-semibold tracking-tight">
                  {project.name}
                </h3>
                {when ? (
                  <p className="mt-1 text-[12px] text-muted-foreground">{when}</p>
                ) : null}
                {project.description ? (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                ) : null}
                <div className="mt-3">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">
                    {t("workAdmin.projects.meta", {
                      phases: summary.phases,
                      tasks: summary.tasks,
                    })}
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary",
                        summary.pct === 100 && "bg-emerald-500"
                      )}
                      style={{ width: `${summary.pct}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <EmployeeAvatarStack
                    employees={employeeMap}
                    ids={project.memberIds}
                  />
                  <span className="truncate text-[12px] text-muted-foreground">
                    {lead
                      ? t("workAdmin.projects.leadName", { name: lead.name })
                      : t("workAdmin.projects.members", {
                          count: project.memberIds.length,
                        })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
