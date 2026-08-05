import { formatISO } from "date-fns";
import { isLocalMode } from "@/lib/env";

/** Canonical "today" for the mock HR dataset (Sunday, Aug 2, 2026 — Cairo). */
export const MOCK_TODAY = "2026-08-02";

/** Africa/Cairo summer offset (EEST). */
export const MOCK_TZ_OFFSET = "+03:00";

/**
 * Demo "now" on MOCK_TODAY using the real wall-clock time-of-day.
 * Keeps timers / late / early-leave realistic without drifting across calendar years.
 */
export function mockNow(): Date {
  const real = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(real.getHours())}:${pad(real.getMinutes())}:${pad(real.getSeconds())}`;
  return new Date(`${MOCK_TODAY}T${time}${MOCK_TZ_OFFSET}`);
}

export function todayKey(): string {
  return MOCK_TODAY;
}

/** Real clock in API mode; frozen demo day in local mode. */
export function demoNow(): Date {
  return isLocalMode() ? mockNow() : new Date();
}

/** YYYY-MM-DD for “today” — mock day in local, real date in API. */
export function demoTodayKey(): string {
  return isLocalMode()
    ? MOCK_TODAY
    : formatISO(new Date(), { representation: "date" });
}

/** Schedule clock on the demo/attendance day with company offset (no device TZ). */
export function scheduleOnDay(dateKey: string, hhmm: string): Date {
  const time = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  return new Date(`${dateKey}T${time}${MOCK_TZ_OFFSET}`);
}

/**
 * Persist attendance timestamps as company-local ISO (`…+03:00`), not UTC `Z`,
 * so night-shift / display hour parsing stays stable.
 */
export function toCompanyIso(d: Date = mockNow(), dateKey = todayKey()): string {
  // Read wall clock from the Date in Africa/Cairo so UTC round-trips stay correct.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  let hour = get("hour");
  if (hour === "24") hour = "00";
  return `${dateKey}T${hour}:${get("minute")}:${get("second")}${MOCK_TZ_OFFSET}`;
}
