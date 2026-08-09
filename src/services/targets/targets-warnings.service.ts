import {
  fetchTargetWarnings,
  patchAcknowledgeWarning,
  postTargetWarning,
} from "@/api/targets.api";
import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { createId } from "@/lib/id";
import {
  performanceTargetRepository,
  targetWarningRepository,
} from "@/repositories";
import {
  targetWarningSchema,
  type TargetWarningInput,
} from "@/schemas/targets.schema";
import { fromError, ok } from "@/services/api-result";
import {
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type { ApiResponse, TargetWarning } from "@/types";
import { notifyQuietly, writeHistory } from "./targets-shared";

export async function getTargetWarnings(filters: {
  targetId?: string;
  employeeId?: string;
} = {}): Promise<ApiResponse<TargetWarning[]>> {
  if (isApiMode()) return fetchTargetWarnings(filters);
  try {
    let rows = await targetWarningRepository.findAll();
    const role = getSessionRole();
    if (role === AppRole.employee) {
      rows = rows.filter((w) => w.employeeId === getWorkEmployeeId());
    } else if (filters.employeeId) {
      rows = rows.filter((w) => w.employeeId === filters.employeeId);
    }
    if (filters.targetId) {
      rows = rows.filter((w) => w.targetId === filters.targetId);
    }
    return ok(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function sendTargetWarning(
  input: TargetWarningInput
): Promise<ApiResponse<TargetWarning>> {
  if (isApiMode()) return postTargetWarning(input);
  try {
    const parsed = targetWarningSchema.parse(input);
    const target = await performanceTargetRepository.findById(parsed.targetId);
    if (!target) throw new NotFoundError("Target not found");
    const actorId = getSessionUserId();
    const row = enrichWithAudit(
      {
        id: createId("tw"),
        targetId: parsed.targetId,
        employeeId: parsed.employeeId,
        reason: parsed.reason,
        managerNotes: parsed.managerNotes,
        requiredAction: parsed.requiredAction,
        penaltyType: parsed.penaltyType,
        penaltyNote: parsed.penaltyNote,
        acknowledgedAt: null,
        acknowledgedBy: null,
      },
      actorId
    );
    await targetWarningRepository.create(row);
    await writeHistory(parsed.targetId, "warning", {
      warningId: row.id,
      penaltyType: row.penaltyType,
    });
    await notifyQuietly(async () => {
      const { notifyTargetWarning } = await import(
        "@/services/notification.service"
      );
      await notifyTargetWarning(target, row);
    });
    return ok(row);
  } catch (error) {
    return fromError(error, {
      id: "",
      targetId: "",
      employeeId: "",
      reason: "",
      managerNotes: "",
      requiredAction: "",
      penaltyType: "written_warning",
      penaltyNote: "",
      acknowledgedAt: null,
      acknowledgedBy: null,
      companyId: "",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: 0,
      metadata: {},
    });
  }
}

export async function acknowledgeTargetWarning(
  id: string
): Promise<ApiResponse<TargetWarning>> {
  if (isApiMode()) return patchAcknowledgeWarning(id);
  try {
    const current = await targetWarningRepository.findById(id);
    if (!current) throw new NotFoundError("Warning not found");
    const role = getSessionRole();
    if (role === AppRole.employee && current.employeeId !== getWorkEmployeeId()) {
      throw new ForbiddenError("Not your warning");
    }
    const next = touchEntity(current, getSessionUserId(), {
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: getSessionUserId(),
    });
    await targetWarningRepository.update(id, next);
    return ok(next);
  } catch (error) {
    return fromError(error, {
      id,
      targetId: "",
      employeeId: "",
      reason: "",
      managerNotes: "",
      requiredAction: "",
      penaltyType: "written_warning",
      penaltyNote: "",
      acknowledgedAt: null,
      acknowledgedBy: null,
      companyId: "",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: 0,
      metadata: {},
    });
  }
}
