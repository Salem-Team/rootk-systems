import { fetchTargetDashboard } from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { fromError, ok } from "@/services/api-result";
import type { ApiResponse, PerformanceTarget, TargetDashboardStats } from "@/types";
import { getTargetCategories } from "./targets-catalog.service";
import { getTargets } from "./targets-query.service";

export async function getTargetDashboard(): Promise<
  ApiResponse<TargetDashboardStats>
> {
  if (isApiMode()) return fetchTargetDashboard();
  try {
    const [targetsRes, catsRes] = await Promise.all([
      getTargets(),
      getTargetCategories(),
    ]);
    const targets = targetsRes.data;
    const categories = catsRes.data;
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const total = targets.length;
    const completed = targets.filter((t) => t.status === "completed").length;
    const delayed = targets.filter((t) => t.status === "delayed").length;
    const critical = targets.filter(
      (t) => t.priority === "critical" || t.riskLevel === "critical"
    ).length;
    const inProgress = targets.filter((t) =>
      ["in_progress", "on_track", "behind_schedule", "assigned"].includes(
        t.status
      )
    ).length;
    const scores = targets.map((t) => t.performanceScore);
    const averagePerformance =
      scores.length === 0
        ? 0
        : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10;

    const employeeScores = new Map<
      string,
      { score: number; completed: number; total: number }
    >();
    for (const t of targets) {
      for (const empId of t.assigneeIds) {
        const cur = employeeScores.get(empId) ?? {
          score: 0,
          completed: 0,
          total: 0,
        };
        cur.total += 1;
        cur.score += t.performanceScore;
        if (t.status === "completed") cur.completed += 1;
        employeeScores.set(empId, cur);
      }
    }
    const ranked = [...employeeScores.entries()]
      .map(([employeeId, v]) => ({
        employeeId,
        score: Math.round((v.score / Math.max(1, v.total)) * 10) / 10,
        completed: v.completed,
        total: v.total,
      }))
      .sort((a, b) => b.score - a.score);

    const byCategoryMap = new Map<
      string,
      { id: string; name: string; color: string; count: number }
    >();
    for (const t of targets) {
      const cat = catMap.get(t.categoryId);
      const cur = byCategoryMap.get(t.categoryId) ?? {
        id: t.categoryId,
        name: cat?.name ?? "—",
        color: cat?.color ?? "#082868",
        count: 0,
      };
      cur.count += 1;
      byCategoryMap.set(t.categoryId, cur);
    }

    const statusCounts = new Map<string, number>();
    for (const t of targets) {
      statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    }

    const deptMap = new Map<
      string,
      { department: string; count: number; scoreSum: number }
    >();
    for (const t of targets) {
      const dept = t.department || "—";
      const cur = deptMap.get(dept) ?? {
        department: dept,
        count: 0,
        scoreSum: 0,
      };
      cur.count += 1;
      cur.scoreSum += t.performanceScore;
      deptMap.set(dept, cur);
    }

    const now = new Date();
    const completionTrend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - (13 - i));
      const date = d.toISOString().slice(0, 10);
      return {
        date,
        created: targets.filter((t) => t.createdAt.slice(0, 10) === date).length,
        completed: targets.filter(
          (t) =>
            t.status === "completed" && t.updatedAt.slice(0, 10) === date
        ).length,
      };
    });

    return ok({
      total,
      completed,
      inProgress,
      delayed,
      critical,
      completionRate:
        total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
      averagePerformance,
      employeesAtRisk: ranked.filter((e) => e.score < 50).length,
      upcomingDeadlines: targets.filter(
        (t) =>
          (t.metrics?.remainingDays ?? 99) <= 7 &&
          t.status !== "completed" &&
          t.status !== "cancelled"
      ).length,
      byCategory: [...byCategoryMap.values()],
      byStatus: [...statusCounts.entries()].map(([status, count]) => ({
        status: status as PerformanceTarget["status"],
        count,
      })),
      byDepartment: [...deptMap.values()].map((d) => ({
        department: d.department,
        count: d.count,
        avgScore: Math.round((d.scoreSum / d.count) * 10) / 10,
      })),
      topPerformers: ranked.slice(0, 5),
      bottomPerformers: ranked.slice(-5).reverse(),
      completionTrend,
    });
  } catch (error) {
    return fromError(error, {
      total: 0,
      completed: 0,
      inProgress: 0,
      delayed: 0,
      critical: 0,
      completionRate: 0,
      averagePerformance: 0,
      employeesAtRisk: 0,
      upcomingDeadlines: 0,
      byCategory: [],
      byStatus: [],
      byDepartment: [],
      topPerformers: [],
      bottomPerformers: [],
      completionTrend: [],
    });
  }
}
