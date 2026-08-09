import { Injectable } from "@nestjs/common";
import { TargetStatus } from "@prisma/client";
import { type Actor } from "./targets-access";
import { TargetsCategoriesService } from "./targets-categories.service";
import { TargetsCrudService } from "./targets-crud.service";

@Injectable()
export class TargetsDashboardService {
  constructor(
    private readonly crud: TargetsCrudService,
    private readonly categories: TargetsCategoriesService
  ) {}

  async dashboard(companyId: string, actor: Actor) {
    const targets = await this.crud.listTargets(companyId, actor, {});
    const categories = await this.categories.listCategories(companyId);
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const total = targets.length;
    const completed = targets.filter((t) => t.status === "completed").length;
    const delayed = targets.filter((t) => t.status === "delayed").length;
    const critical = targets.filter(
      (t) => t.priority === "critical" || t.riskLevel === "critical"
    ).length;
    const inProgress = targets.filter(
      (t) =>
        t.status === "in_progress" ||
        t.status === "on_track" ||
        t.status === "behind_schedule" ||
        t.status === "assigned"
    ).length;

    const scores = targets.map((t) => t.performanceScore);
    const averagePerformance =
      scores.length === 0
        ? 0
        : Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
          ) / 10;

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

    const employeesAtRisk = ranked.filter((e) => e.score < 50).length;
    const upcomingDeadlines = targets.filter((t) => {
      const days = t.metrics?.remainingDays ?? 99;
      return days <= 7 && t.status !== "completed" && t.status !== "cancelled";
    }).length;

    const byCategoryMap = new Map<
      string,
      { id: string; name: string; color: string; count: number }
    >();
    for (const t of targets) {
      const cat = catMap.get(t.categoryId);
      const key = t.categoryId;
      const cur = byCategoryMap.get(key) ?? {
        id: key,
        name: cat?.name ?? "—",
        color: cat?.color ?? "#082868",
        count: 0,
      };
      cur.count += 1;
      byCategoryMap.set(key, cur);
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

    return {
      total,
      completed,
      inProgress,
      delayed,
      critical,
      completionRate:
        total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
      averagePerformance,
      employeesAtRisk,
      upcomingDeadlines,
      byCategory: [...byCategoryMap.values()],
      byStatus: [...statusCounts.entries()].map(([status, count]) => ({
        status: status as TargetStatus,
        count,
      })),
      byDepartment: [...deptMap.values()].map((d) => ({
        department: d.department,
        count: d.count,
        avgScore: Math.round((d.scoreSum / d.count) * 10) / 10,
      })),
      topPerformers: ranked.slice(0, 5),
      bottomPerformers: ranked.slice(-5).reverse(),
      completionTrend: this.buildTrend(targets),
    };
  }

  private buildTrend(
    targets: Array<{
      createdAt: string;
      status: string;
      updatedAt: string;
    }>
  ) {
    const days: Array<{ date: string; completed: number; created: number }> =
      [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, completed: 0, created: 0 });
    }
    const index = new Map(days.map((d, i) => [d.date, i]));
    for (const t of targets) {
      const created = t.createdAt.slice(0, 10);
      const ci = index.get(created);
      if (ci !== undefined) days[ci].created += 1;
      if (t.status === "completed") {
        const updated = t.updatedAt.slice(0, 10);
        const ui = index.get(updated);
        if (ui !== undefined) days[ui].completed += 1;
      }
    }
    return days;
  }
}
