import type { DayOfWeek, WorkSchedule } from "@/types";

export const WEEK_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export interface EmployeeWorkSchedule {
  workingDays: DayOfWeek[];
  weekendDays: DayOfWeek[];
  wfhDays: DayOfWeek[];
  fromTime: string;
  toTime: string;
  gracePeriodMinutes: number;
  breakMinutes: number;
}

function isDay(value: string): value is DayOfWeek {
  return (WEEK_DAYS as string[]).includes(value);
}

function asConfig(value: unknown): EmployeeWorkSchedule | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const workingDays = Array.isArray(row.workingDays)
    ? row.workingDays.map(String).filter(isDay)
    : [];
  const fromTime = String(row.fromTime ?? "");
  const toTime = String(row.toTime ?? "");
  if (!/^\d{2}:\d{2}$/.test(fromTime) || !/^\d{2}:\d{2}$/.test(toTime)) {
    return null;
  }
  if (workingDays.length === 0) return null;
  const wfhDays = Array.isArray(row.wfhDays)
    ? row.wfhDays.map(String).filter(isDay).filter((day) => workingDays.includes(day))
    : [];
  return {
    workingDays,
    weekendDays: WEEK_DAYS.filter((day) => !workingDays.includes(day)),
    wfhDays,
    fromTime,
    toTime,
    gracePeriodMinutes: Math.max(0, Number(row.gracePeriodMinutes) || 0),
    breakMinutes: Math.max(0, Number(row.breakMinutes) || 0),
  };
}

export function readEmployeeSchedules(
  schedule: Pick<WorkSchedule, "employeeSchedules" | "metadata">
): Record<string, EmployeeWorkSchedule> {
  const fromField = schedule.employeeSchedules;
  const fromMeta =
    schedule.metadata &&
    typeof schedule.metadata === "object" &&
    !Array.isArray(schedule.metadata)
      ? (schedule.metadata as { employeeSchedules?: unknown }).employeeSchedules
      : undefined;
  const raw = fromField ?? fromMeta;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, EmployeeWorkSchedule> = {};
  for (const [id, value] of Object.entries(raw)) {
    const parsed = asConfig(value);
    if (!id.trim() || !parsed) continue;
    out[id] = parsed;
  }
  return out;
}

/** Company schedule with this employee's saved hours, when they have their own. */
export function effectiveEmployeeSchedule(
  company: WorkSchedule,
  employeeId: string
): WorkSchedule {
  const custom = readEmployeeSchedules(company)[employeeId];
  if (!custom) return company;
  return {
    ...company,
    ...custom,
    holidays: company.holidays,
  };
}
