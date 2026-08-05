import { getDay, parseISO } from "date-fns";
import type { DayOfWeek, Department, WorkSchedule } from "@/types";
import type { ScheduleAdminMetadata, WfhPolicyExtras } from "@/types/org";

const DAY_FROM_INDEX: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  return DAY_FROM_INDEX[getDay(parseISO(dateKey))] ?? "sunday";
}

/** Resolved WFH policy with safe defaults for missing metadata. */
export function resolveWfhPolicy(
  schedule: WorkSchedule
): WfhPolicyExtras & { enabled: boolean } {
  const meta = (schedule.metadata ?? {}) as ScheduleAdminMetadata;
  const extras = meta.wfhPolicy;
  return {
    enabled: extras?.enabled ?? true,
    allowedDepartments: extras?.allowedDepartments ?? [],
    requiresApproval: extras?.requiresApproval ?? false,
    monthlyQuota: extras?.monthlyQuota ?? 0,
    hybridOfficeDays: extras?.hybridOfficeDays ?? 0,
  };
}

/**
 * Employee may use WFH check-in when admin enabled the feature,
 * their department is allowed, and today is a configured WFH day.
 */
export function isEmployeeWfhAllowed(
  schedule: WorkSchedule,
  department: Department,
  dateKey: string
): boolean {
  const policy = resolveWfhPolicy(schedule);
  if (!policy.enabled) return false;
  if (!policy.allowedDepartments.includes(department)) return false;
  const day = dayOfWeekFromDateKey(dateKey);
  return schedule.wfhDays.includes(day);
}
