import type { TranslationPath } from "@/i18n";

type TranslateFn = (
  path: TranslationPath,
  vars?: Record<string, string | number>
) => string;

/** Split total minutes into whole hours + remainder minutes. */
export function splitMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const safe = Math.max(0, Math.round(Number(totalMinutes) || 0));
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

/**
 * Compact professional duration for late / early badges.
 * e.g. 337 → "5س 37د" / "5h 37m"
 */
export function formatHmDuration(
  totalMinutes: number,
  t: TranslateFn
): string {
  const { hours, minutes } = splitMinutes(totalMinutes);
  if (hours > 0 && minutes > 0) {
    return t("attendance.lateDurationHm", { hours, minutes });
  }
  if (hours > 0) {
    return t("attendance.lateDurationH", { hours });
  }
  return t("attendance.lateDurationM", { minutes });
}

/** Spoken / notification form — same compact units, clear in both locales. */
export function formatHmDurationFull(
  totalMinutes: number,
  t: TranslateFn
): string {
  const { hours, minutes } = splitMinutes(totalMinutes);
  if (hours > 0 && minutes > 0) {
    return t("attendance.lateDurationHmFull", { hours, minutes });
  }
  if (hours > 0) {
    return t("attendance.lateDurationHFull", { hours });
  }
  return t("attendance.lateDurationMFull", { minutes });
}
