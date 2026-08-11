import type { DailyPlanSlot } from "@/types/daily-plan";

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHmMinutes(hm: string): number | null {
  const match = HM.exec(hm.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function sortDailyPlanSlots<T extends Pick<DailyPlanSlot, "startTime" | "sortOrder">>(
  slots: T[]
): T[] {
  return [...slots].sort((a, b) => {
    const aMin = parseHmMinutes(a.startTime) ?? 0;
    const bMin = parseHmMinutes(b.startTime) ?? 0;
    if (aMin !== bMin) return aMin - bMin;
    return a.sortOrder - b.sortOrder;
  });
}

export function slotsOverlap(
  a: Pick<DailyPlanSlot, "startTime" | "endTime">,
  b: Pick<DailyPlanSlot, "startTime" | "endTime">
): boolean {
  const aStart = parseHmMinutes(a.startTime);
  const aEnd = parseHmMinutes(a.endTime);
  const bStart = parseHmMinutes(b.startTime);
  const bEnd = parseHmMinutes(b.endTime);
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) {
    return false;
  }
  return aStart < bEnd && bStart < aEnd;
}

export function findOverlappingSlots(
  slots: Array<Pick<DailyPlanSlot, "id" | "startTime" | "endTime">>
): string[] {
  const ids: string[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      if (slotsOverlap(slots[i], slots[j])) {
        ids.push(slots[i].id, slots[j].id);
      }
    }
  }
  return [...new Set(ids)];
}

export type DailyPlanPhase = "empty" | "before" | "current" | "between" | "after";

export interface DailyPlanNow {
  phase: DailyPlanPhase;
  current: DailyPlanSlot | null;
  next: DailyPlanSlot | null;
  previous: DailyPlanSlot | null;
  /** 0–1 progress through the current slot. */
  progress: number;
}

export function resolveDailyPlanNow(
  slots: DailyPlanSlot[],
  now: Date = new Date()
): DailyPlanNow {
  const ordered = sortDailyPlanSlots(slots.filter((s) => !s.deletedAt));
  if (ordered.length === 0) {
    return {
      phase: "empty",
      current: null,
      next: null,
      previous: null,
      progress: 0,
    };
  }

  const nowMin = minutesOfDay(now);
  const timed = ordered.map((slot) => ({
    slot,
    start: parseHmMinutes(slot.startTime) ?? 0,
    end: parseHmMinutes(slot.endTime) ?? 0,
  }));

  const currentIdx = timed.findIndex((row) => nowMin >= row.start && nowMin < row.end);
  if (currentIdx >= 0) {
    const row = timed[currentIdx];
    const span = Math.max(1, row.end - row.start);
    return {
      phase: "current",
      current: row.slot,
      next: timed[currentIdx + 1]?.slot ?? null,
      previous: timed[currentIdx - 1]?.slot ?? null,
      progress: Math.min(1, Math.max(0, (nowMin - row.start) / span)),
    };
  }

  const nextIdx = timed.findIndex((row) => nowMin < row.start);
  if (nextIdx === 0) {
    return {
      phase: "before",
      current: null,
      next: timed[0].slot,
      previous: null,
      progress: 0,
    };
  }
  if (nextIdx > 0) {
    return {
      phase: "between",
      current: null,
      next: timed[nextIdx].slot,
      previous: timed[nextIdx - 1].slot,
      progress: 0,
    };
  }

  return {
    phase: "after",
    current: null,
    next: null,
    previous: timed[timed.length - 1].slot,
    progress: 1,
  };
}
