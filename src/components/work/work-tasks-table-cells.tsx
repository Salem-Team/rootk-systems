"use client";

import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import {
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WorkStatusDot } from "@/components/work/work-motion";
import { initials } from "@/components/work/employee-avatar-initials";
import { statusLabelKey } from "@/components/work/employee-work-hub-types";
import { useTranslation } from "@/hooks/use-translation";
import { completionNeedsEvidenceDialog } from "@/lib/task-evidence";
import {
  ensureTaskAssigneeProgress,
  taskAssigneeCompletionSummary,
} from "@/lib/task-assignee-progress";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TaskPriority, TaskStatus, WorkTask } from "@/types/work";

const AVATAR_TONES = [
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
];

const PRIORITY_PILL: Record<TaskPriority, string> = {
  high: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
};

function avatarTone(seed: string): string {
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) {
    n = (n + seed.charCodeAt(i)) % AVATAR_TONES.length;
  }
  return AVATAR_TONES[n] ?? AVATAR_TONES[0];
}

export function TaskTitleCell({ task }: { task: WorkTask }) {
  const subtitle = task.description.trim() || task.tag.trim();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className={cn("text-[11px]", avatarTone(task.title))}>
          {initials(task.title) || "•"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-[13px] font-semibold leading-snug",
            task.status === "completed" &&
              "text-muted-foreground line-through decoration-border"
          )}
        >
          {task.title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TaskStatusCell({ status }: { status: TaskStatus }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      <WorkStatusDot status={status} />
      {t(statusLabelKey(status))}
    </span>
  );
}

export function TaskPriorityPill({ priority }: { priority: TaskPriority }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium",
        PRIORITY_PILL[priority]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {t(`ops.priority.${priority}`)}
    </span>
  );
}

export function TaskDueCell({
  dueDate,
  overdue,
  dateLocale,
}: {
  dueDate: string;
  overdue: boolean;
  dateLocale: Locale;
}) {
  const { t } = useTranslation();
  if (!dueDate) {
    return (
      <span className="text-[12px] text-muted-foreground">
        {t("ops.due.none")}
      </span>
    );
  }

  const label = format(parseISO(dueDate.slice(0, 10)), "d MMM yyyy", {
    locale: dateLocale,
  });

  return (
    <div className="min-w-0">
      <p
        className={cn(
          "text-[13px] leading-snug",
          overdue && "font-medium text-rose-600 dark:text-rose-400"
        )}
      >
        {label}
      </p>
      {overdue ? (
        <p className="mt-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {t("ops.due.overdue")}
        </p>
      ) : null}
    </div>
  );
}

export function TaskOriginCell({ origin }: { origin?: WorkTask["origin"] }) {
  const { t } = useTranslation();
  const personal = (origin ?? "assigned") === "personal";
  return (
    <span className="text-[12px] text-muted-foreground">
      {personal ? t("workHub.originPersonal") : t("workHub.originAssigned")}
    </span>
  );
}

export function TaskAssigneeCell({
  ids,
  employees,
  selectedId,
  onSelect,
  task,
}: {
  ids: string[];
  employees?: Map<string, Employee>;
  selectedId?: string;
  onSelect?: (id: string) => void;
  task?: WorkTask;
}) {
  const { t } = useTranslation();
  const progress = task
    ? ensureTaskAssigneeProgress(task).assigneeProgress
    : undefined;
  const summary = taskAssigneeCompletionSummary(progress);
  const statusById = new Map(
    (progress ?? []).map((row) => [row.employeeId, row.status])
  );

  if (!employees || ids.length === 0) {
    return (
      <span className="text-[12px] text-muted-foreground">
        {t("workTable.unassigned")}
      </span>
    );
  }

  const names = ids
    .map((id) => employees.get(id)?.name)
    .filter(Boolean) as string[];
  const first = names[0] ?? t("workTable.unassigned");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-[12.5rem] flex-col items-start gap-0.5 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-start text-[12px] text-foreground/85 transition-colors hover:bg-muted/50"
        >
          <span className="inline-flex max-w-full items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {ids.length === 1
                ? first
                : t("workTable.viewAssignees", { count: String(ids.length) })}
            </span>
          </span>
          {ids.length > 1 ? (
            <span className="ps-5 text-[11px] font-medium text-muted-foreground">
              {t("workTable.assigneeProgressShort", {
                done: String(summary.completedCount),
                total: String(summary.total),
              })}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="mb-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {t("workTable.colAssignee")}
        </p>
        {ids.length > 1 ? (
          <p className="mb-2 px-1.5 text-[12px] text-muted-foreground">
            {t("workTable.assigneeProgress", {
              done: String(summary.completedCount),
              pending: String(summary.pendingCount),
            })}
          </p>
        ) : null}
        <ul className="max-h-56 space-y-0.5 overflow-y-auto">
          {ids.map((id) => {
            const emp = employees.get(id);
            const name = emp?.name ?? id;
            const active = selectedId === id;
            const rowStatus = statusById.get(id);
            const done = rowStatus === "completed";
            return (
              <li key={id}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(selectedId === id ? "" : id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors",
                      active
                        ? "bg-primary/[0.1] font-medium text-primary"
                        : "hover:bg-muted/60"
                    )}
                    aria-pressed={active}
                  >
                    <AssigneeRow name={name} department={emp?.department} />
                    {rowStatus ? (
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-medium",
                          done
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {done
                          ? t("workTable.assigneeDone")
                          : t("workTable.assigneePending")}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px]">
                    <AssigneeRow name={name} department={emp?.department} />
                    {rowStatus ? (
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-medium",
                          done
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {done
                          ? t("workTable.assigneeDone")
                          : t("workTable.assigneePending")}
                      </span>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function AssigneeRow({
  name,
  department,
}: {
  name: string;
  department?: string;
}) {
  return (
    <>
      <Avatar className="h-7 w-7">
        <AvatarFallback className="text-[9px]">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {department ? (
        <span className="truncate text-[11px] text-muted-foreground">
          {department}
        </span>
      ) : null}
    </>
  );
}

export function TaskRowMenu({
  task,
  busy,
  canManage,
  onView,
  onDone,
  onEdit,
  onDelete,
}: {
  task: WorkTask;
  busy?: boolean;
  canManage?: boolean;
  onView?: (task: WorkTask) => void;
  onDone?: (task: WorkTask) => void;
  onEdit?: (task: WorkTask) => void;
  onDelete?: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();
  const showDone = Boolean(onDone) && task.status !== "completed";
  const showEdit = Boolean(onEdit) && canManage !== false;
  const showDelete = Boolean(onDelete) && canManage !== false;
  if (!onView && !showDone && !showEdit && !showDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          aria-label={t("workTable.moreActions")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView ? (
          <DropdownMenuItem onClick={() => onView(task)}>
            <Eye className="h-3.5 w-3.5" />
            {t("common.view")}
          </DropdownMenuItem>
        ) : null}
        {showDone ? (
          <DropdownMenuItem disabled={busy} onClick={() => onDone?.(task)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {completionNeedsEvidenceDialog(task)
              ? t("workEvidence.done")
              : t("workEvidence.markComplete")}
          </DropdownMenuItem>
        ) : null}
        {showEdit ? (
          <DropdownMenuItem onClick={() => onEdit?.(task)}>
            <Pencil className="h-3.5 w-3.5" />
            {t("common.edit")}
          </DropdownMenuItem>
        ) : null}
        {showDelete ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete?.(task)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("common.delete")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
