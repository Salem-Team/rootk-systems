import { DEFAULT_COMPANY_ID } from "../common/company";
import { dateOnly, parseDate } from "../common/mappers";
import type {
  DayOfWeek,
  EmployeeSalaryProfile,
  SchedulePayrollContext,
} from "../lib/payroll-engine-types";
import type { SalaryPayload } from "./payroll.types";

export const WEEK_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return WEEK_DAYS[utc.getUTCDay()];
}

export function listWorkingDates(
  start: string,
  end: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>
): string[] {
  const out: string[] = [];
  const cursor = parseDate(start);
  const last = parseDate(end);
  while (cursor <= last) {
    const key = dateOnly(cursor);
    const dow = dayOfWeekFromDateKey(key);
    if (workingDays.includes(dow) && !holidayDates.has(key)) out.push(key);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function countWorkingDaysInRange(
  start: string,
  end: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>
): number {
  return listWorkingDates(start, end, workingDays, holidayDates).length;
}

export function leaveDaysInPeriod(
  startDate: string,
  endDate: string,
  periodStart: string,
  periodEnd: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>,
  fallbackDays: number
): number {
  const start = startDate > periodStart ? startDate : periodStart;
  const end = endDate < periodEnd ? endDate : periodEnd;
  if (start > end) return 0;
  const counted = countWorkingDaysInRange(start, end, workingDays, holidayDates);
  return counted > 0 ? counted : fallbackDays;
}

export function isNightShiftHint(checkIn?: string | null): boolean {
  if (!checkIn) return false;
  const match = checkIn.match(/T(\d{2}):/);
  if (!match) return false;
  const hour = Number(match[1]);
  return hour >= 20 || hour < 6;
}

export function inferEarlyLeaveMinutes(
  row: {
    earlyLeaveMinutes?: number | null;
    isEarlyLeave: boolean;
    workingMinutes: number;
  },
  scheduledNet: number
): number {
  if (typeof row.earlyLeaveMinutes === "number" && row.earlyLeaveMinutes > 0) {
    return row.earlyLeaveMinutes;
  }
  if (!row.isEarlyLeave) return 0;
  if (row.workingMinutes > 0 && scheduledNet > row.workingMinutes) {
    return scheduledNet - row.workingMinutes;
  }
  return Math.round(scheduledNet * 0.25);
}

export function aggregateAttendanceOvertime(
  rows: {
    date: string;
    workingMinutes: number;
    overtimeMinutes?: number;
    checkOut?: string | null;
  }[],
  scheduleCtx: SchedulePayrollContext,
  holidayDates: Set<string>
): { regular: number; weekend: number; holiday: number } {
  let regular = 0;
  let weekend = 0;
  let holiday = 0;
  const minNet = scheduleCtx.minimumWorkingMinutes;
  for (const row of rows) {
    if (!row.checkOut && row.workingMinutes <= 0) continue;
    const day = dayOfWeekFromDateKey(row.date);
    const fromField = (row.overtimeMinutes ?? 0) / 60;
    const fromExcess = Math.max(0, (row.workingMinutes - minNet) / 60);
    const otHours = fromField > 0 ? fromField : fromExcess;
    if (holidayDates.has(row.date)) {
      holiday += otHours > 0 ? otHours : row.workingMinutes / 60;
    } else if (scheduleCtx.weekendDays.includes(day)) {
      weekend += row.workingMinutes / 60;
    } else {
      regular += otHours;
    }
  }
  return {
    regular: Math.round(regular * 100) / 100,
    weekend: Math.round(weekend * 100) / 100,
    holiday: Math.round(holiday * 100) / 100,
  };
}

export function toEngineProfile(
  employeeId: string,
  profile: SalaryPayload
): EmployeeSalaryProfile {
  const a = profile.allowances ?? {};
  const d = profile.deductions ?? {};
  const now = new Date().toISOString();
  return {
    id: `sal_${employeeId}`,
    employeeId,
    basicSalary: profile.basicSalary,
    allowances: {
      housing: a.housing ?? 0,
      transportation: a.transportation ?? 0,
      meal: a.meal ?? 0,
      phone: a.phone ?? 0,
      other: a.other ?? 0,
      shift: a.shift ?? 0,
    },
    bonuses: profile.bonuses ?? 0,
    commission: profile.commission ?? 0,
    incentives: profile.incentives ?? 0,
    manualAdjustments: profile.manualAdjustments ?? 0,
    deductions: {
      insurance: d.insurance ?? 0,
      tax: d.tax ?? 0,
      loan: d.loan ?? 0,
      advances: d.advances ?? 0,
      recurring: d.recurring ?? 0,
      penalties: d.penalties ?? 0,
    },
    salaryGrade: (profile.salaryGrade as EmployeeSalaryProfile["salaryGrade"]) ?? "G3",
    salaryType: (profile.salaryType as EmployeeSalaryProfile["salaryType"]) ?? "monthly",
    payrollGroup: (profile.payrollGroup as EmployeeSalaryProfile["payrollGroup"]) ?? "standard",
    currency: profile.currency ?? "EGP",
    bankAccount: String(profile.bankAccount ?? ""),
    iban: String(profile.iban ?? ""),
    paymentMethod: (profile.paymentMethod as EmployeeSalaryProfile["paymentMethod"]) ?? "bank_transfer",
    insuranceStatus: (profile.insuranceStatus as EmployeeSalaryProfile["insuranceStatus"]) ?? "insured",
    taxStatus: (profile.taxStatus as EmployeeSalaryProfile["taxStatus"]) ?? "resident",
    contractType: (profile.contractType as EmployeeSalaryProfile["contractType"]) ?? "full_time",
    joiningDate: String(profile.joiningDate ?? now.slice(0, 10)),
    effectiveFrom: String(profile.effectiveFrom ?? now.slice(0, 10)),
    history: [],
    incrementHistory: [],
    companyId: DEFAULT_COMPANY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  };
}
