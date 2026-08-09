import { fetchDelayedCenter } from "@/api/targets.api";
import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import { workTaskRepository } from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import {
  getSessionRole,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type { ApiResponse, PerformanceTarget, WorkTask } from "@/types";
import { getTargets } from "./targets-query.service";

export async function getDelayedCenter(): Promise<
  ApiResponse<{
    delayedTargets: PerformanceTarget[];
    criticalTargets: PerformanceTarget[];
    highRiskTargets: PerformanceTarget[];
    delayedTasks: WorkTask[];
  }>
> {
  if (isApiMode()) {
    const res = await fetchDelayedCenter();
    return {
      ...res,
      data: {
        ...res.data,
        delayedTasks: res.data.delayedTasks as unknown as WorkTask[],
      },
    };
  }
  try {
    const targetsRes = await getTargets();
    const targets = targetsRes.data;
    const delayedTargets = targets.filter(
      (t) =>
        t.status === "delayed" ||
        t.riskLevel === "critical" ||
        t.riskLevel === "high" ||
        t.health === "critical" ||
        t.health === "delayed"
    );
    const tasks = await workTaskRepository.findAll();
    const now = Date.now();
    const role = getSessionRole();
    const empId = getWorkEmployeeId();
    let delayedTasks = tasks.filter(
      (t) =>
        (t.dueDate &&
          new Date(t.dueDate).getTime() < now &&
          t.status !== "completed") ||
        (t.targetId && delayedTargets.some((dt) => dt.id === t.targetId))
    );
    if (role === AppRole.employee) {
      delayedTasks = delayedTasks.filter((t) => t.assigneeIds.includes(empId));
    }
    return ok({
      delayedTargets,
      criticalTargets: targets.filter(
        (t) => t.priority === "critical" || t.riskLevel === "critical"
      ),
      highRiskTargets: targets.filter((t) => t.riskLevel === "high"),
      delayedTasks,
    });
  } catch (error) {
    return fromError(error, {
      delayedTargets: [],
      criticalTargets: [],
      highRiskTargets: [],
      delayedTasks: [],
    });
  }
}
