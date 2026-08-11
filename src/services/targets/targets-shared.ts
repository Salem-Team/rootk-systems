import { AppRole } from "@/constants/roles";
import { enrichWithAudit } from "@/lib/entity";
import { ForbiddenError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { canTarget } from "@/lib/target-policies";
import { computeTargetProgress } from "@/lib/target-progress";
import { targetHistoryRepository } from "@/repositories";
import {
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type {
  PerformanceTarget,
  TargetFilters,
  TargetHistoryEvent,
} from "@/types";

export async function notifyQuietly(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch {
    /* domain notifications must never break core flows */
  }
}

export function withMetrics(target: PerformanceTarget): PerformanceTarget {
  const metrics = computeTargetProgress({
    quantity: target.quantity,
    completedQuantity: target.completedQuantity,
    startDate: target.startDate,
    endDate: target.endDate,
    status: target.status,
  });
  return { ...target, metrics, performanceScore: metrics.performanceScore };
}

export function assertCap(capability: Parameters<typeof canTarget>[1]) {
  const role = getSessionRole();
  if (!canTarget(role, capability)) {
    throw new ForbiddenError("Insufficient target permissions");
  }
}

export function scopeTargets(
  items: PerformanceTarget[],
  filters: TargetFilters
): PerformanceTarget[] {
  const role = getSessionRole();
  let list = items.map(withMetrics);

  if (role === AppRole.employee && filters.team) {
    /* report ids filled by getTargets after loading the roster */
  } else if (role === AppRole.employee) {
    const empId = getWorkEmployeeId();
    list = list.filter((t) => t.assigneeIds.includes(empId));
  } else if (filters.employeeId) {
    list = list.filter((t) => t.assigneeIds.includes(filters.employeeId!));
  }

  if (filters.department)
    list = list.filter((t) => t.department === filters.department);
  if (filters.branch) list = list.filter((t) => t.branch === filters.branch);
  if (filters.categoryId)
    list = list.filter((t) => t.categoryId === filters.categoryId);
  if (filters.typeId) list = list.filter((t) => t.typeId === filters.typeId);
  if (filters.priority)
    list = list.filter((t) => t.priority === filters.priority);
  if (filters.status) list = list.filter((t) => t.status === filters.status);
  if (filters.riskLevel)
    list = list.filter((t) => t.riskLevel === filters.riskLevel);
  if (filters.delayedOnly)
    list = list.filter((t) => t.status === "delayed");
  if (filters.completedOnly)
    list = list.filter((t) => t.status === "completed");
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
    );
  }
  if (filters.minProgress != null)
    list = list.filter(
      (t) => (t.metrics?.percentage ?? 0) >= filters.minProgress!
    );
  if (filters.maxProgress != null)
    list = list.filter(
      (t) => (t.metrics?.percentage ?? 0) <= filters.maxProgress!
    );

  return list.sort((a, b) => a.endDate.localeCompare(b.endDate));
}

export async function writeHistory(
  targetId: string,
  action: string,
  snapshot: Record<string, unknown>
) {
  const actorId = getSessionUserId();
  const event: TargetHistoryEvent = enrichWithAudit(
    {
      id: createId("th"),
      targetId,
      action,
      actorId,
      note: "",
      snapshot,
    },
    actorId
  );
  await targetHistoryRepository.create(event);
}
