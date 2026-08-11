import { fetchTargetById, fetchTargets } from "@/api/targets.api";
import { isApiMode } from "@/lib/env";
import { performanceTargetRepository } from "@/repositories";
import { fail, fromError, ok } from "@/services/api-result";
import type { ApiResponse, PerformanceTarget, TargetFilters } from "@/types";
import { assertCap, scopeTargets } from "./targets-shared";

export async function getTargets(
  filters: TargetFilters = {}
): Promise<ApiResponse<PerformanceTarget[]>> {
  if (isApiMode()) return fetchTargets(filters);
  try {
    const rows = await performanceTargetRepository.findAll();
    let scoped = scopeTargets(rows, filters);
    if (filters.team) {
      const { getSessionRole, getWorkEmployeeId } = await import(
        "@/stores/session-store"
      );
      const { AppRole } = await import("@/constants/roles");
      if (getSessionRole() === AppRole.employee) {
        const { listLocalDirectReportIds } = await import(
          "@/services/team-access"
        );
        const reportIds = new Set(
          await listLocalDirectReportIds(getWorkEmployeeId())
        );
        scoped = scoped.filter((target) =>
          target.assigneeIds.some((id) => reportIds.has(id))
        );
      }
    }
    return ok(scoped);
  } catch (error) {
    return fromError(error, []);
  }
}

export async function getTarget(
  id: string
): Promise<ApiResponse<PerformanceTarget | null>> {
  if (isApiMode()) return fetchTargetById(id);
  try {
    const row = await performanceTargetRepository.findById(id);
    if (!row) return ok(null);
    const scoped = scopeTargets([row], {});
    return ok(scoped[0] ?? null);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function exportTargetsCsv(
  filters: TargetFilters = {}
): Promise<ApiResponse<string>> {
  try {
    assertCap("export");
    const res = await getTargets(filters);
    if (!res.success) return fail("", res.message ?? "Failed", "EXPORT_FAILED");
    const header = [
      "title",
      "status",
      "priority",
      "quantity",
      "completed",
      "progress",
      "performance",
      "startDate",
      "endDate",
      "risk",
      "health",
    ].join(",");
    const lines = res.data.map((t) =>
      [
        JSON.stringify(t.title),
        t.status,
        t.priority,
        t.quantity,
        t.completedQuantity,
        t.metrics?.percentage ?? 0,
        t.performanceScore,
        t.startDate,
        t.endDate,
        t.riskLevel,
        t.health,
      ].join(",")
    );
    return ok([header, ...lines].join("\n"));
  } catch (error) {
    return fromError(error, "");
  }
}
