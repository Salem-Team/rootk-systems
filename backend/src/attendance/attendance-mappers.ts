import type { WorkClockSchedule } from "../lib/work-time";
import type { GeoPoint } from "../lib/geo";
import { auditFields, dateOnly, isoOrNull } from "../common/mappers";

export type ScheduleBundle = WorkClockSchedule & {
  wfhDays: string[];
  metadata: unknown;
};

export type PunchLocation = GeoPoint & { accuracy?: number };

export const DEFAULT_SCHEDULE: ScheduleBundle = {
  fromTime: "09:00",
  toTime: "18:00",
  gracePeriodMinutes: 15,
  breakMinutes: 60,
  halfDayHours: 4,
  wfhDays: [],
  metadata: {},
};

export function mapAttendance(row: {
  id: string;
  companyId: string;
  employeeId: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  workingMinutes: number;
  grossMinutes: number;
  breakAppliedMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  lateMinutes: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: dateOnly(row.date),
    checkIn: isoOrNull(row.checkIn) ?? undefined,
    checkOut: isoOrNull(row.checkOut) ?? undefined,
    status: row.status,
    workingMinutes: row.workingMinutes,
    grossMinutes: row.grossMinutes,
    breakAppliedMinutes: row.breakAppliedMinutes,
    earlyLeaveMinutes: row.earlyLeaveMinutes,
    overtimeMinutes: row.overtimeMinutes,
    isLate: row.isLate,
    isEarlyLeave: row.isEarlyLeave,
    lateMinutes: row.lateMinutes,
    note: row.note ?? undefined,
    ...auditFields(row),
  };
}

export function asMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}
