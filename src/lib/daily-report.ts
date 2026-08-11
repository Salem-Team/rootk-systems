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

export function isInDateRange(
  iso: string | null | undefined,
  from: string,
  to: string
): boolean {
  if (!iso) return false;
  const key = iso.slice(0, 10);
  if (!iso.includes("T")) return key >= from && key <= to;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return key >= from && key <= to;
  return t >= dayBounds(from).start.getTime() && t <= dayBounds(to).end.getTime();
}

export function isInDay(iso: string | null | undefined, date: string): boolean {
  return isInDateRange(iso, date, date);
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
  activeCalls?: number;
  inactiveCalls?: number;
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
  if ((input.activeCalls ?? 0) > 0) {
    facts.push({ kind: "activeCalls", count: input.activeCalls });
  }
  if ((input.inactiveCalls ?? 0) > 0) {
    facts.push({ kind: "inactiveCalls", count: input.inactiveCalls });
  }
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
