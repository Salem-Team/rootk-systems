import { scheduleOnDay } from "./work-time";

/** No late charge before this many minutes past the shift start. */
export const LATE_ALLOWANCE_MINUTES = 30;

/** Clock minutes after the scheduled start. Punch grace is not subtracted. */
export function clockLateMinutes(
  checkIn: Date | string,
  dateKey: string,
  fromTime: string
): number {
  const start = scheduleOnDay(dateKey, fromTime);
  const at = checkIn instanceof Date ? checkIn : new Date(checkIn);
  if (Number.isNaN(at.getTime())) return 0;
  return Math.max(0, Math.round((at.getTime() - start.getTime()) / 60000));
}

/**
 * Deducted minutes. Allowance is the first 30 minutes.
 * After that the charge doubles the bracket:
 * 30m → 1h, 1h → 2h, 2h → 4h, 4h → 8h, 8h → 16h.
 */
export function doubledLateChargeMinutes(clockLate: number): number {
  if (clockLate < LATE_ALLOWANCE_MINUTES) return 0;
  let bracket = LATE_ALLOWANCE_MINUTES;
  while (clockLate >= bracket * 2) bracket *= 2;
  return bracket * 2;
}

export function lateDayFraction(
  clockLate: number,
  minutesPerDay = 480
): number {
  const charged = doubledLateChargeMinutes(clockLate);
  if (charged <= 0) return 0;
  const day = Math.max(minutesPerDay, 1);
  return Math.round((charged / day) * 1000) / 1000;
}

export function lateDeductionAmount(
  dayFraction: number,
  basicSalary: number,
  workingDaysInMonth: number
): number | null {
  if (dayFraction <= 0 || basicSalary <= 0 || workingDaysInMonth <= 0) {
    return null;
  }
  const daily = basicSalary / workingDaysInMonth;
  return Math.round(dayFraction * daily * 100) / 100;
}
