import { AppRole } from "@/constants/roles";
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
import {
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
  if (!canCrm(role, capability)) {
    throw new ForbiddenError("You do not have permission for this action");
  }
}

export function isAdmin(): boolean {
  return getSessionRole() === AppRole.admin;
}

export function actorEmployeeId(): string | null {
  return getWorkEmployeeId();
}

export function assertLeadAccess(lead: CrmLead): void {
  if (isAdmin()) return;
  const empId = actorEmployeeId();
  if (!empId || lead.ownerEmployeeId !== empId) {
    throw new ForbiddenError("You can only access your assigned leads");
  }
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
