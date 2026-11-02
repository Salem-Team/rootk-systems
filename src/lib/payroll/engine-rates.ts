import type { DayOfWeek } from "@/types";
import type {
  PayrollCalculationInput,
  PayrollPolicies,
} from "@/types/payroll";

export function roundAmount(
  value: number,
  mode: PayrollPolicies["autoRounding"]
): number {
  switch (mode) {
    case "nearest_1":
      return Math.round(value);
    case "nearest_5":
      return Math.round(value / 5) * 5;
    case "nearest_10":
      return Math.round(value / 10) * 10;
    default:
      return Math.round(value * 100) / 100;
  }
}

/** Employees on this contracted basic salary do not receive overtime pay. */
export const OVERTIME_EXEMPT_BASIC_SALARY = 5000;

export function isOvertimeExemptBasic(basicSalary: number): boolean {
  return Math.round(basicSalary) === OVERTIME_EXEMPT_BASIC_SALARY;
}

export function allowancesTotal(input: PayrollCalculationInput): number {
  const a = input.profile.allowances;
  return (
    a.housing + a.transportation + a.meal + a.phone + a.other + a.shift
  );
}

const WEEK_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function dayOfWeekFromDateKey(dateKey: string): DayOfWeek {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEK_DAYS[new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay()];
}

function countWorkingDaysInRange(
  start: string,
  end: string,
  workingDays: DayOfWeek[],
  holidayDates: Set<string>
): number {
  let count = 0;
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    const dow = dayOfWeekFromDateKey(key);
    if (workingDays.includes(dow) && !holidayDates.has(key)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Mid-month join factor for monthly salary (rates stay on full contract). */
export function resolveJoinMonthFactor(input: PayrollCalculationInput): {
  factor: number;
  eligibleDays: number;
  monthDays: number;
} {
  const monthDays = Math.max(input.period.workingDays, 1);
  const join = String(input.profile.joiningDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(join)) {
    return { factor: 1, eligibleDays: monthDays, monthDays };
  }
  if (join <= input.period.startDate) {
    return { factor: 1, eligibleDays: monthDays, monthDays };
  }
  if (join > input.period.endDate) {
    return { factor: 0, eligibleDays: 0, monthDays };
  }

  const workingDays =
    input.schedule?.workingDays ??
    (["sunday", "monday", "tuesday", "wednesday", "thursday"] as DayOfWeek[]);
  const holidays = new Set(input.holidayDates ?? []);
  const eligibleDays = countWorkingDaysInRange(
    join,
    input.period.endDate,
    workingDays,
    holidays
  );
  const factor = Math.min(1, Math.max(0, eligibleDays / monthDays));
  return { factor, eligibleDays, monthDays };
}

export function resolveRates(input: PayrollCalculationInput): {
  daily: number;
  hourly: number;
  hoursPerDay: number;
} {
  const base =
    input.profile.basicSalary +
    allowancesTotal(input) +
    input.profile.bonuses +
    input.profile.commission;
  const workingDays = Math.max(input.period.workingDays, 1);
  const minMinutes =
    input.schedule?.minimumWorkingMinutes ??
    input.policies.minimumWorkingMinutes;
  const hoursPerDay = Math.max(minMinutes / 60, 1);

  switch (input.profile.salaryType) {
    case "hourly":
      return {
        hourly: input.profile.basicSalary,
        daily: input.profile.basicSalary * hoursPerDay,
        hoursPerDay,
      };
    case "daily":
      return {
        daily: input.profile.basicSalary,
        hourly: input.profile.basicSalary / hoursPerDay,
        hoursPerDay,
      };
    case "weekly":
      return {
        daily: (input.profile.basicSalary * 4.33) / workingDays,
        hourly: (input.profile.basicSalary * 4.33) / workingDays / hoursPerDay,
        hoursPerDay,
      };
    case "monthly":
    default:
      return {
        daily: base / workingDays,
        hourly: base / workingDays / hoursPerDay,
        hoursPerDay,
      };
  }
}
