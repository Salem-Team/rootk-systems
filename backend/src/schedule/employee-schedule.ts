import { BadRequestException } from "@nestjs/common";

const WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export interface EmployeeScheduleConfig {
  workingDays: string[];
  weekendDays: string[];
  wfhDays: string[];
  fromTime: string;
  toTime: string;
  gracePeriodMinutes: number;
  breakMinutes: number;
}

function isDay(value: string): boolean {
  return (WEEK as readonly string[]).includes(value);
}

function isClock(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function clockMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function asConfig(value: unknown): EmployeeScheduleConfig | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const workingDays = Array.isArray(row.workingDays)
    ? row.workingDays.map(String).filter(isDay)
    : [];
  const fromTime = String(row.fromTime ?? "");
  const toTime = String(row.toTime ?? "");
  if (workingDays.length === 0 || !isClock(fromTime) || !isClock(toTime)) {
    return null;
  }
  const weekendDays = WEEK.filter((day) => !workingDays.includes(day));
  const wfhDays = Array.isArray(row.wfhDays)
    ? row.wfhDays.map(String).filter((day) => workingDays.includes(day))
    : [];
  return {
    workingDays,
    weekendDays: [...weekendDays],
    wfhDays,
    fromTime,
    toTime,
    gracePeriodMinutes: Math.max(0, Number(row.gracePeriodMinutes) || 0),
    breakMinutes: Math.max(0, Number(row.breakMinutes) || 0),
  };
}

export function readEmployeeSchedules(
  metadata: unknown
): Record<string, EmployeeScheduleConfig> {
  if (!metadata || typeof metadata !== "object") return {};
  const raw = (metadata as { employeeSchedules?: unknown }).employeeSchedules;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, EmployeeScheduleConfig> = {};
  for (const [id, value] of Object.entries(raw)) {
    const key = id.trim();
    const parsed = asConfig(value);
    if (!key || !parsed) continue;
    out[key] = parsed;
  }
  return out;
}

export function sanitizeEmployeeSchedule(
  body: Record<string, unknown>
): EmployeeScheduleConfig {
  const workingDays = Array.isArray(body.workingDays)
    ? [...new Set(body.workingDays.map(String).filter(isDay))]
    : [];
  if (workingDays.length === 0) {
    throw new BadRequestException("Choose at least one working day");
  }
  const fromTime = String(body.fromTime ?? "");
  const toTime = String(body.toTime ?? "");
  if (!isClock(fromTime) || !isClock(toTime) || clockMinutes(toTime) <= clockMinutes(fromTime)) {
    throw new BadRequestException("Invalid schedule hours");
  }
  const grace = Number(body.gracePeriodMinutes);
  const breakMinutes = Number(body.breakMinutes);
  if (!Number.isInteger(grace) || grace < 0 || grace > 180) {
    throw new BadRequestException("Invalid grace period");
  }
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 240) {
    throw new BadRequestException("Invalid break");
  }
  const wfhDays = Array.isArray(body.wfhDays)
    ? [...new Set(body.wfhDays.map(String).filter((day) => workingDays.includes(day)))]
    : [];
  return {
    workingDays,
    weekendDays: WEEK.filter((day) => !workingDays.includes(day)),
    wfhDays,
    fromTime,
    toTime,
    gracePeriodMinutes: grace,
    breakMinutes,
  };
}

export function overlayEmployeeClock<
  T extends {
    fromTime: string;
    toTime: string;
    gracePeriodMinutes: number;
    breakMinutes: number;
    wfhDays: string[];
  },
>(base: T, metadata: unknown, employeeId?: string | null): T {
  if (!employeeId) return base;
  const custom = readEmployeeSchedules(metadata)[employeeId];
  if (!custom) return base;
  return {
    ...base,
    fromTime: custom.fromTime,
    toTime: custom.toTime,
    gracePeriodMinutes: custom.gracePeriodMinutes,
    breakMinutes: custom.breakMinutes,
    wfhDays: custom.wfhDays,
  };
}
