import { enrichWithAudit } from "@/lib/entity";
import { ForbiddenError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { isInRange } from "@/lib/organic-ads-analytics";
import { canViewOthersInModule } from "@/constants/permissions";
import { canOrganicAds } from "@/lib/organic-ads-policies";
import { isOrganicAdsLinkableTask, isOrganicAdsType } from "@/lib/organic-ads-task-match";
import { emitWorkUpdated } from "@/lib/events";
import {
  organicAdHistoryRepository,
  organicAdsSettingsRepository,
  organicAdvertisementRepository,
} from "@/repositories/organic-ads.repository";
import { workTaskRepository } from "@/repositories";
import {
  authPermissionSet,
  getSessionPermissions,
  getSessionRole,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type { WorkTask } from "@/types";
import type {
  LinkedTargetProgress,
  OrganicAdHistoryEvent,
  OrganicAdsFilters,
  OrganicAdsSettings,
  OrganicAdvertisement,
} from "@/types/organic-ads";

/** Dual-mode: Nest API when `NEXT_PUBLIC_DATA_SOURCE=api`, else LocalStorage. */

export function assertCap(
  capability: Parameters<typeof canOrganicAds>[1]
): void {
  const role = getSessionRole();
  if (!canOrganicAds(role, capability, authPermissionSet())) {
    throw new ForbiddenError("You do not have permission for this action");
  }
}

export function canSeeOrganicAdsTeam(): boolean {
  return canViewOthersInModule(
    getSessionPermissions(),
    "organicAds.viewAll",
    "organicAds.viewTeam"
  ).team;
}

export async function defaultSettings(): Promise<OrganicAdsSettings> {
  const existing = await organicAdsSettingsRepository.get();
  if (existing) return existing;
  const seeded = enrichWithAudit(
    {
      id: "organic-ads-settings",
      weeklyTarget: 3,
      allowDuplicateOverride: true,
    },
    "system"
  );
  return organicAdsSettingsRepository.set(seeded);
}

export async function writeHistory(
  partial: Omit<
    OrganicAdHistoryEvent,
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
  const event = enrichWithAudit(
    {
      id: createId("oadh"),
      ...partial,
    },
    partial.actorId
  );
  await organicAdHistoryRepository.create(event);
}

function normalizeAd(ad: OrganicAdvertisement): OrganicAdvertisement {
  return {
    ...ad,
    workTaskId: ad.workTaskId ?? null,
    targetId: ad.targetId ?? null,
    leadsCount: ad.leadsCount ?? null,
    qualifiedLeadsCount: ad.qualifiedLeadsCount ?? null,
    dealsCount: ad.dealsCount ?? null,
    similarityScore: ad.similarityScore ?? null,
  };
}

export async function scopedAds(): Promise<OrganicAdvertisement[]> {
  const all = (await organicAdvertisementRepository.findAll())
    .filter((a) => !a.deletedAt)
    .map(normalizeAd);
  const others = canViewOthersInModule(
    getSessionPermissions(),
    "organicAds.viewAll",
    "organicAds.viewTeam"
  );
  if (others.team) return all;
  const employeeId = getWorkEmployeeId();
  if (!employeeId) return [];
  return all.filter((a) => a.ownerEmployeeId === employeeId);
}

export function findDuplicate(
  ads: OrganicAdvertisement[],
  canonicalUrl: string,
  externalId: string | null,
  platform: string,
  excludeId?: string
): OrganicAdvertisement | null {
  const exact = ads.find(
    (a) =>
      a.id !== excludeId &&
      !a.deletedAt &&
      a.canonicalUrl === canonicalUrl
  );
  if (exact) return exact;

  if (externalId) {
    const byId = ads.find(
      (a) =>
        a.id !== excludeId &&
        !a.deletedAt &&
        a.platform === platform &&
        a.externalId === externalId
    );
    if (byId) return byId;
  }
  return null;
}

export async function claimedTaskIds(): Promise<Set<string>> {
  const ads = await organicAdvertisementRepository.findAll();
  return new Set(
    ads.map((a) => a.workTaskId).filter((id): id is string => !!id)
  );
}

async function adsTypeByTargetId() {
  const { performanceTargetRepository, targetTypeRepository } = await import(
    "@/repositories"
  );
  const [targets, types] = await Promise.all([
    performanceTargetRepository.findAll(),
    targetTypeRepository.findAll(),
  ]);
  const typeMap = new Map(types.map((ty) => [ty.id, ty]));
  const out = new Map<string, (typeof types)[number]>();
  for (const target of targets) {
    const type = typeMap.get(target.typeId);
    if (type) out.set(target.id, type);
  }
  return out;
}

export async function findOpenLinkableTaskLocal(
  ownerEmployeeId: string,
  preferredTaskId?: string,
  preferredTargetId?: string
): Promise<WorkTask | null> {
  const claimed = await claimedTaskIds();
  const typeByTarget = await adsTypeByTargetId();
  const tasks = (await workTaskRepository.findAll()).filter((t) => {
    if (t.deletedAt || t.status === "completed") return false;
    if (!t.assigneeIds.includes(ownerEmployeeId) || claimed.has(t.id)) {
      return false;
    }
    const type = t.targetId ? typeByTarget.get(t.targetId) : null;
    return isOrganicAdsLinkableTask(t, type);
  });

  if (preferredTaskId) {
    return tasks.find((t) => t.id === preferredTaskId) ?? null;
  }

  const scoped = preferredTargetId
    ? tasks.filter((t) => t.targetId === preferredTargetId)
    : tasks;

  return scoped.find((t) => !!t.targetId) ?? scoped[0] ?? null;
}

export async function completeLinkedTaskLocal(
  taskId: string,
  adUrl: string,
  platform: string
): Promise<void> {
  const { updateWorkTaskStatus } = await import("@/services/work.service");
  await updateWorkTaskStatus(taskId, "completed", {
    links: [adUrl],
    notes: `Organic advertisement linked (${platform})`,
  });
  emitWorkUpdated();
}

export async function reopenLinkedTaskLocal(taskId: string): Promise<void> {
  const { updateWorkTaskStatus } = await import("@/services/work.service");
  const task = await workTaskRepository.findById(taskId);
  if (!task || task.status !== "completed") return;
  await updateWorkTaskStatus(taskId, "todo");
  emitWorkUpdated();
}

export async function linkedTargetsForAds(
  ads: OrganicAdvertisement[],
  ownerEmployeeId?: string | null
): Promise<LinkedTargetProgress[]> {
  const { performanceTargetRepository, targetTypeRepository } = await import(
    "@/repositories"
  );
  const [targets, types] = await Promise.all([
    performanceTargetRepository.findAll(),
    targetTypeRepository.findAll(),
  ]);
  const typeMap = new Map(types.map((ty) => [ty.id, ty]));
  const linkedIds = new Set(
    ads.map((a) => a.targetId).filter((id): id is string => !!id)
  );

  return targets
    .filter((t) => {
      if (t.deletedAt) return false;
      if (["cancelled", "archived"].includes(t.status)) return false;
      const type = typeMap.get(t.typeId);
      const isAds = isOrganicAdsType(type) || linkedIds.has(t.id);
      if (!isAds) return false;
      if (ownerEmployeeId && !t.assigneeIds.includes(ownerEmployeeId)) {
        return false;
      }
      return true;
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      quantity: t.quantity,
      completedQuantity: t.completedQuantity,
      remaining: Math.max(0, t.quantity - t.completedQuantity),
      status: t.status,
      health: t.health,
      assigneeIds: t.assigneeIds,
      typeName: typeMap.get(t.typeId)?.name,
      unit: t.unit,
    }));
}

export function filterAds(
  ads: OrganicAdvertisement[],
  filters: OrganicAdsFilters
): OrganicAdvertisement[] {
  let list = [...ads];
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (a) =>
        a.url.toLowerCase().includes(q) ||
        a.project.toLowerCase().includes(q) ||
        a.campaign.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q) ||
        a.platform.includes(q)
    );
  }
  if (filters.ownerEmployeeId) {
    list = list.filter((a) => a.ownerEmployeeId === filters.ownerEmployeeId);
  }
  if (filters.platform) {
    list = list.filter((a) => a.platform === filters.platform);
  }
  if (filters.project) {
    list = list.filter((a) => a.project === filters.project);
  }
  if (filters.status) {
    list = list.filter((a) => a.status === filters.status);
  }
  if (filters.validationStatus) {
    list = list.filter((a) => a.validationStatus === filters.validationStatus);
  }
  if (filters.duplicateOnly) {
    list = list.filter((a) => a.status === "duplicate" || !!a.duplicateOfId);
  }
  if (filters.range && filters.range !== "all") {
    list = list.filter((a) => isInRange(a.addedAt, filters.range!));
  }
  if (filters.dateFrom) {
    list = list.filter((a) => a.addedAt >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    list = list.filter((a) => a.addedAt <= filters.dateTo!);
  }

  const sortBy = filters.sortBy ?? "addedAt";
  const dir = filters.sortDir === "asc" ? 1 : -1;
  list.sort((a, b) => {
    if (sortBy === "platform") return a.platform.localeCompare(b.platform) * dir;
    if (sortBy === "status") return a.status.localeCompare(b.status) * dir;
    if (sortBy === "owner") {
      return a.ownerEmployeeId.localeCompare(b.ownerEmployeeId) * dir;
    }
    return a.addedAt.localeCompare(b.addedAt) * dir;
  });
  return list;
}
