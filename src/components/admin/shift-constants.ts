import type { ShiftType } from "@/types/org";
import type { TranslationPath } from "@/i18n";

export const SHIFT_COLORS = [
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
];

export const SHIFT_TYPE_LABEL: Record<ShiftType, TranslationPath> = {
  morning: "admin.shiftMorning",
  evening: "admin.shiftEvening",
  night: "admin.shiftNight",
  flexible: "admin.shiftFlexible",
  hybrid: "admin.shiftHybrid",
  remote: "admin.shiftRemote",
};

export const SHIFT_TYPES = Object.keys(SHIFT_TYPE_LABEL) as ShiftType[];

export function timeToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m) / (24 * 60)) * 100;
}

export const EMPTY_SHIFT_DRAFT = {
  id: "",
  name: "",
  type: "morning" as ShiftType,
  start: "09:00",
  end: "18:00",
  color: SHIFT_COLORS[0],
  active: true,
};
