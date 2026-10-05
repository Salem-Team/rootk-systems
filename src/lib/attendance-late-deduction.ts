import type { AttendanceRecord } from "@/types";

export type LateDeduction = {
  dayFraction: number;
  chargedMinutes?: number;
  amount: number | null;
  currency: string;
};

/** No late charge before this many minutes past the shift start. */
export const LATE_ALLOWANCE_MINUTES = 30;

/** Clock minutes after scheduled start (Africa/Cairo wall time). */
export function clockLateMinutes(
  checkInIso: string,
  dateKey: string,
  fromTime = "09:00"
): number {
  const time = fromTime.length === 5 ? `${fromTime}:00` : fromTime;
  const start = new Date(`${dateKey}T${time}+03:00`);
  const at = new Date(checkInIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(at.getTime())) return 0;
  return Math.max(0, Math.round((at.getTime() - start.getTime()) / 60000));
}

/**
 * Deducted minutes. First 30 minutes are free.
 * Then the charge doubles: 30m → 1h, 1h → 2h, 2h → 4h, and so on.
 */
export function doubledLateChargeMinutes(clockLate: number): number {
  if (clockLate < LATE_ALLOWANCE_MINUTES) return 0;
  let bracket = LATE_ALLOWANCE_MINUTES;
  while (clockLate >= bracket * 2) bracket *= 2;
  return bracket * 2;
}

export function lateDayFraction(clockLate: number, minutesPerDay = 480): number {
  const charged = doubledLateChargeMinutes(clockLate);
  if (charged <= 0) return 0;
  return Math.round((charged / Math.max(minutesPerDay, 1)) * 1000) / 1000;
}

export function lateChargeHours(deduction: {
  chargedMinutes?: number;
  dayFraction: number;
}): number {
  if (deduction.chargedMinutes && deduction.chargedMinutes > 0) {
    return deduction.chargedMinutes / 60;
  }
  return Math.round(deduction.dayFraction * 8 * 100) / 100;
}

export function readLateDeduction(
  record: Pick<AttendanceRecord, "checkIn" | "date" | "isLate" | "lateDeduction">
): LateDeduction | null {
  if (record.lateDeduction && record.lateDeduction.dayFraction > 0) {
    return record.lateDeduction;
  }
  if (record.lateDeduction) return null;
  if (!record.isLate || !record.checkIn) return null;
  const chargedMinutes = doubledLateChargeMinutes(
    clockLateMinutes(record.checkIn, record.date)
  );
  if (!chargedMinutes) return null;
  return {
    dayFraction: chargedMinutes / 480,
    chargedMinutes,
    amount: null,
    currency: "EGP",
  };
}

export function formatLateDeductionAmount(
  amount: number,
  locale: string,
  currency = "EGP"
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function sumLateDeductions(
  records: AttendanceRecord[],
  monthKey: string
): { count: number; amount: number; hasAmount: boolean } {
  let count = 0;
  let amount = 0;
  let hasAmount = false;
  for (const record of records) {
    if (!record.date.startsWith(monthKey)) continue;
    const hit = readLateDeduction(record);
    if (!hit) continue;
    count += 1;
    if (hit.amount != null) {
      hasAmount = true;
      amount += hit.amount;
    }
  }
  return {
    count,
    amount: Math.round(amount * 100) / 100,
    hasAmount,
  };
}
