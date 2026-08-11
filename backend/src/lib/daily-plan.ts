const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHmMinutes(hm: string): number | null {
  const match = HM.exec(String(hm ?? "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function normalizeHm(value: string): string | null {
  const raw = String(value ?? "").trim();
  if (HM.test(raw)) return raw;
  const loose = /^(\d{1,2}):([0-5]\d)$/.exec(raw);
  if (!loose) return null;
  const hours = Number(loose[1]);
  if (hours > 23) return null;
  return `${String(hours).padStart(2, "0")}:${loose[2]}`;
}

export function slotsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
