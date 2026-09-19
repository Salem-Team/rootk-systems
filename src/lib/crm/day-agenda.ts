import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { isFollowUpOverdue, parseMaybe } from "@/lib/crm/date-range";
import type { CrmLead } from "@/types/crm";
import type { WorkTask } from "@/types/work";

export function localDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function followUpDayKey(iso: string | null | undefined): string | null {
  const due = parseMaybe(iso);
  return due ? localDayKey(due) : null;
}

export function taskDayKey(dueDate: string | null | undefined): string | null {
  const raw = dueDate?.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return followUpDayKey(raw);
}

export function weekFrom(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function leadsOnDay(leads: CrmLead[], day: Date, now = new Date()): CrmLead[] {
  const key = localDayKey(day);
  return leads
    .filter((lead) => followUpDayKey(lead.nextFollowUpAt) === key)
    .filter((lead) => !isSameDay(day, now) || !isFollowUpOverdue(lead.nextFollowUpAt, now))
    .sort((a, b) => String(a.nextFollowUpAt).localeCompare(String(b.nextFollowUpAt)));
}

export function overdueLeads(leads: CrmLead[], now = new Date()): CrmLead[] {
  return leads
    .filter((lead) => isFollowUpOverdue(lead.nextFollowUpAt, now))
    .sort((a, b) => String(a.nextFollowUpAt).localeCompare(String(b.nextFollowUpAt)));
}

export function tasksOnDay(tasks: WorkTask[], day: Date): WorkTask[] {
  const key = localDayKey(day);
  const rank = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter((task) => taskDayKey(task.dueDate) === key)
    .sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      return rank[a.priority] - rank[b.priority];
    });
}
