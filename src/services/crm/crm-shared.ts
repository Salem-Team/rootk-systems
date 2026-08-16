import {
  resolveDataAccessScope,
  type DataAccessScope,
} from "@/constants/permissions";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit } from "@/lib/entity";
import { ForbiddenError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { canCrm } from "@/lib/crm-policies";
import {
  crmBusinessTypeRepository,
  crmFeedbackTypeRepository,
  crmLeadHistoryRepository,
  crmStageRepository,
  crmSubStageRepository,
} from "@/repositories/crm.repository";
import { localEmployeeIdsForModule } from "@/services/employee-scope";
import {
  authPermissionSet,
  getSessionPermissions,
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type {
  CrmBusinessType,
  CrmFeedbackType,
  CrmLead,
  CrmLeadHistoryEvent,
  CrmStage,
  CrmSubStage,
} from "@/types/crm";

export function assertCap(capability: Parameters<typeof canCrm>[1]): void {
  const role = getSessionRole();
  if (!canCrm(role, capability, authPermissionSet())) {
    throw new ForbiddenError("You do not have permission for this action");
  }
}

export function crmLeadAccessScope(): DataAccessScope {
  return resolveDataAccessScope(
    getSessionPermissions(),
    "crm.viewOthersLeads",
    "crm.viewTeamLeads",
    getSessionRole()
  );
}

export function canViewOthersCrm(): boolean {
  return crmLeadAccessScope() === "all";
}

export function canViewTeamCrm(): boolean {
  return crmLeadAccessScope() !== "own";
}

export async function resolveCrmOwnerIds(): Promise<string[] | null> {
  return localEmployeeIdsForModule("crm.viewOthersLeads", "crm.viewTeamLeads");
}

export async function crmLeadFilterScope(): Promise<{
  actorEmployeeId: string | null;
  canViewOthers: boolean;
  teamOwnerIds?: string[];
}> {
  const ownerIds = await resolveCrmOwnerIds();
  return {
    actorEmployeeId: actorEmployeeId(),
    canViewOthers: ownerIds === null,
    teamOwnerIds: ownerIds ?? undefined,
  };
}

export function actorEmployeeId(): string | null {
  return getWorkEmployeeId();
}

/**
 * Local-mode lists pin owner to the signed-in sales user unless they may see others.
 * API mode must not add an owner filter — the server applies fresh permissions.
 */
export function scopeCrmFiltersToActor<T extends { ownerEmployeeId?: string }>(
  filters: T
): T {
  if (isApiMode() || canViewTeamCrm()) return filters;
  const empId = actorEmployeeId()?.trim() ?? "";
  return { ...filters, ownerEmployeeId: empId || undefined };
}

export async function assertLeadAccess(lead: CrmLead): Promise<void> {
  const allowed = await resolveCrmOwnerIds();
  if (allowed === null) return;
  if (lead.ownerEmployeeId && allowed.includes(lead.ownerEmployeeId)) return;
  throw new ForbiddenError("You can only access leads in your team scope");
}

export async function writeHistory(
  partial: Omit<
    CrmLeadHistoryEvent,
    | "id"
    | "companyId"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "isArchived"
    | "version"
    | "metadata"
  >
): Promise<void> {
  const actorId = getSessionUserId() || "system";
  const row = enrichWithAudit(
    {
      id: createId("crm-hist"),
      ...partial,
    },
    actorId
  );
  await crmLeadHistoryRepository.create(row);
}

export async function ensureCatalog(): Promise<{
  stages: CrmStage[];
  subStages: CrmSubStage[];
  feedbackTypes: CrmFeedbackType[];
  businessTypes: CrmBusinessType[];
}> {
  let stages = await crmStageRepository.findAll();
  let subStages = await crmSubStageRepository.findAll();
  let feedbackTypes = await crmFeedbackTypeRepository.findAll();
  let businessTypes = await crmBusinessTypeRepository.findAll();
  if (
    stages.length === 0 ||
    feedbackTypes.length === 0 ||
    businessTypes.length === 0
  ) {
    const {
      crmStagesSeed,
      crmSubStagesSeed,
      crmFeedbackTypesSeed,
      crmBusinessTypesSeed,
    } = await import("@/mocks/crm");
    if (stages.length === 0) {
      for (const s of crmStagesSeed) {
        await crmStageRepository.create(enrichWithAudit(s, "system"));
      }
      stages = await crmStageRepository.findAll();
    }
    if (subStages.length === 0) {
      for (const s of crmSubStagesSeed) {
        await crmSubStageRepository.create(enrichWithAudit(s, "system"));
      }
      subStages = await crmSubStageRepository.findAll();
    }
    if (feedbackTypes.length === 0) {
      for (const t of crmFeedbackTypesSeed) {
        await crmFeedbackTypeRepository.create(enrichWithAudit(t, "system"));
      }
      feedbackTypes = await crmFeedbackTypeRepository.findAll();
    }
    if (businessTypes.length === 0) {
      for (const t of crmBusinessTypesSeed) {
        await crmBusinessTypeRepository.create(enrichWithAudit(t, "system"));
      }
      businessTypes = await crmBusinessTypeRepository.findAll();
    }
  } else if (subStages.length === 0 && stages.length > 0) {
    const { crmSubStagesSeed } = await import("@/mocks/crm");
    const stageIds = new Set(stages.map((s) => s.id));
    for (const s of crmSubStagesSeed) {
      if (!stageIds.has(s.stageId)) continue;
      await crmSubStageRepository.create(enrichWithAudit(s, "system"));
    }
    subStages = await crmSubStageRepository.findAll();
  }
  return {
    stages: stages.sort((a, b) => a.sortOrder - b.sortOrder),
    subStages: subStages.sort((a, b) => a.sortOrder - b.sortOrder),
    feedbackTypes: feedbackTypes.sort((a, b) => a.sortOrder - b.sortOrder),
    businessTypes: businessTypes.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function nestSubStages(
  stages: CrmStage[],
  subStages: CrmSubStage[]
): CrmStage[] {
  const byStage = new Map<string, CrmSubStage[]>();
  for (const sub of subStages) {
    const list = byStage.get(sub.stageId) ?? [];
    list.push(sub);
    byStage.set(sub.stageId, list);
  }
  return stages.map((stage) => ({
    ...stage,
    subStages: (byStage.get(stage.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
  }));
}
