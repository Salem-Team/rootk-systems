import { isApiMode } from "@/lib/env";
import { fetchApprovalRules, patchApprovalRule } from "@/api/org.api";
import { approvalsRepository } from "@/repositories/org.repository";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import type { ApiResponse } from "@/types";
import type { ApprovalRule } from "@/types/org";

export * from "./org-locations.service";
export * from "./org-departments.service";
export * from "./org-positions-shifts.service";

/** GET /org/approvals */
export async function getApprovalRules(): Promise<ApiResponse<ApprovalRule[]>> {
  if (isApiMode()) return fetchApprovalRules();
  try {
    await simulateDelay();
    return ok(await approvalsRepository.list());
  } catch (error) {
    return fromError(error, []);
  }
}

/** PATCH /org/approvals/:id */
export async function updateApprovalRule(
  id: string,
  requiresApproval: boolean
): Promise<ApiResponse<ApprovalRule[]>> {
  if (isApiMode()) return patchApprovalRule(id, requiresApproval);
  try {
    await simulateDelay();
    await approvalsRepository.setRequiresApproval(id, requiresApproval);
    return ok(await approvalsRepository.list(), "Approval rule updated");
  } catch (error) {
    return fromError(error, []);
  }
}
