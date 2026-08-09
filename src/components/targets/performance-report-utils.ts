import type { ProgressRingTone } from "@/components/targets/target-progress-ring";
import type { Employee } from "@/types";
import type { PerformanceTarget } from "@/types/targets";

export const RING_TONE: Record<PerformanceTarget["health"], ProgressRingTone> = {
  excellent: "success",
  good: "success",
  average: "primary",
  warning: "warning",
  critical: "danger",
  delayed: "danger",
};

export interface RosterRow {
  employeeId: string;
  name: string;
  department: string;
  score: number;
  total: number;
  completed: number;
  open: number;
  delayed: number;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function buildRoster(
  targets: PerformanceTarget[],
  employees: Map<string, Employee>
): RosterRow[] {
  const map = new Map<
    string,
    { scores: number[]; total: number; completed: number; open: number; delayed: number }
  >();

  for (const target of targets) {
    for (const id of target.assigneeIds) {
      const cur = map.get(id) ?? {
        scores: [],
        total: 0,
        completed: 0,
        open: 0,
        delayed: 0,
      };
      cur.scores.push(target.performanceScore);
      cur.total += 1;
      if (target.status === "completed") cur.completed += 1;
      else if (target.status !== "cancelled") cur.open += 1;
      if (target.status === "delayed" || target.riskLevel === "critical") {
        cur.delayed += 1;
      }
      map.set(id, cur);
    }
  }

  return [...map.entries()]
    .map(([employeeId, agg]) => {
      const emp = employees.get(employeeId);
      const score =
        agg.scores.length === 0
          ? 0
          : Math.round(
              (agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length) * 10
            ) / 10;
      return {
        employeeId,
        name: emp?.name ?? employeeId,
        department: emp?.department ?? "",
        score,
        total: agg.total,
        completed: agg.completed,
        open: agg.open,
        delayed: agg.delayed,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
