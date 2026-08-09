import { fetchEmployeeTargetPerformance } from "@/api/targets.api";
import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import { workTaskRepository } from "@/repositories";
import { fail, fromError, ok } from "@/services/api-result";
import { getSessionRole, getWorkEmployeeId } from "@/stores/session-store";
import type { ApiResponse, EmployeeTargetPerformance } from "@/types";
import { getTargetWarnings } from "./targets-warnings.service";
import { getTargets } from "./targets-query.service";

export async function getEmployeeTargetPerformance(
  employeeId: string
): Promise<ApiResponse<EmployeeTargetPerformance>> {
  if (isApiMode()) return fetchEmployeeTargetPerformance(employeeId);
  try {
    const role = getSessionRole();
    if (role === AppRole.employee && employeeId !== getWorkEmployeeId()) {
      return fail(
        {
          employeeId,
          overallScore: 0,
          currentTargets: 0,
          completed: 0,
          remaining: 0,
          warnings: 0,
          delayedTasks: 0,
          monthlyTrend: [],
          targets: [],
        },
        "Not allowed",
        "FORBIDDEN"
      );
    }
    const [targetsRes, warningsRes] = await Promise.all([
      getTargets({ employeeId }),
      getTargetWarnings({ employeeId }),
    ]);
    const targets = targetsRes.data;
    const scores = targets.map((t) => t.performanceScore);
    const overallScore =
      scores.length === 0
        ? 0
        : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10;
    const tasks = await workTaskRepository.findAll();
    const now = Date.now();
    const delayedTasks = tasks.filter(
      (t) =>
        t.assigneeIds.includes(employeeId) &&
        t.status !== "completed" &&
        t.dueDate &&
        new Date(t.dueDate).getTime() < now
    ).length;

    const monthMap = new Map<string, { sum: number; n: number }>();
    for (const t of targets) {
      const month = t.updatedAt.slice(0, 7);
      const cur = monthMap.get(month) ?? { sum: 0, n: 0 };
      cur.sum += t.performanceScore;
      cur.n += 1;
      monthMap.set(month, cur);
    }

    return ok({
      employeeId,
      overallScore,
      currentTargets: targets.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled"
      ).length,
      completed: targets.filter((t) => t.status === "completed").length,
      remaining: targets
        .map((t) => t.metrics?.remaining ?? 0)
        .reduce((a, b) => a + b, 0),
      warnings: warningsRes.data.length,
      delayedTasks,
      monthlyTrend: [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, v]) => ({
          month,
          score: Math.round((v.sum / v.n) * 10) / 10,
        })),
      targets,
    });
  } catch (error) {
    return fromError(error, {
      employeeId,
      overallScore: 0,
      currentTargets: 0,
      completed: 0,
      remaining: 0,
      warnings: 0,
      delayedTasks: 0,
      monthlyTrend: [],
      targets: [],
    });
  }
}
