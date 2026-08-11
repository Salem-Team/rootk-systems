import type { DailyReportFact } from "@/types/daily-report";

export function isValidReportDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function dayBounds(date: string): { start: Date; end: Date } {
  return {
    start: new Date(`${date}T00:00:00.000`),
    end: new Date(`${date}T23:59:59.999`),
  };
}

export function isInDay(iso: string | null | undefined, date: string): boolean {
  if (!iso) return false;
  if (iso.length >= 10 && iso.slice(0, 10) === date && !iso.includes("T")) {
    return true;
  }
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso.slice(0, 10) === date;
  const { start, end } = dayBounds(date);
  return t >= start.getTime() && t <= end.getTime();
}

export function formatWorkedHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function buildDailyReportFacts(input: {
  onLeave: boolean;
  attendanceStatus: string | null;
  taskTitles: string[];
  adsCount: number;
  crmCount: number;
  meetingsCount: number;
}): DailyReportFact[] {
  if (input.onLeave) return [{ kind: "leave" }];
  if (input.attendanceStatus === "absent") return [{ kind: "absent" }];

  const facts: DailyReportFact[] = [];
  if (input.taskTitles.length > 0) {
    facts.push({
      kind: "tasks",
      count: input.taskTitles.length,
      sample: input.taskTitles.slice(0, 2).join(" · "),
    });
  }
  if (input.adsCount > 0) facts.push({ kind: "ads", count: input.adsCount });
  if (input.crmCount > 0) facts.push({ kind: "crm", count: input.crmCount });
  if (input.meetingsCount > 0) {
    facts.push({ kind: "meetings", count: input.meetingsCount });
  }
  if (facts.length === 0) {
    if (
      input.attendanceStatus === "present" ||
      input.attendanceStatus === "late" ||
      input.attendanceStatus === "wfh" ||
      input.attendanceStatus === "early_leave" ||
      input.attendanceStatus === "half_day"
    ) {
      return [{ kind: "present" }];
    }
    return [{ kind: "none" }];
  }
  return facts;
}
