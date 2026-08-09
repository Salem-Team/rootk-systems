import {
  fetchLinkableOrganicAdTasks,
  fetchOrganicAdById,
  fetchOrganicAds,
  postInspectOrganicAdUrl,
} from "@/api/organic-ads.api";
import { isApiMode } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { canOrganicAds } from "@/lib/organic-ads-policies";
import { inspectAdUrl } from "@/lib/organic-ads-url";
import { organicAdvertisementRepository, organicAdHistoryRepository } from "@/repositories/organic-ads.repository";
import { workTaskRepository } from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import {
  getSessionRole,
  getSessionUserId,
  getWorkEmployeeId,
} from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type {
  LinkableWorkTask,
  OrganicAdHistoryEvent,
  OrganicAdsFilters,
  OrganicAdvertisement,
  PaginatedAds,
  UrlInspectionResult,
} from "@/types/organic-ads";
import {
  assertCap,
  claimedTaskIds,
  filterAds,
  findDuplicate,
  scopedAds,
} from "./helpers";

export async function inspectOrganicAdUrl(
  url: string
): Promise<ApiResponse<UrlInspectionResult>> {
  try {
    if (isApiMode()) return postInspectOrganicAdUrl(url);
    await simulateDelay(180);
    assertCap("create");
    const inspected = inspectAdUrl(url);
    const ads = await scopedAds();
    const all = await organicAdvertisementRepository.findAll();
    const pool = canOrganicAds(getSessionRole(), "view_team") ? all : ads;
    const duplicate = findDuplicate(
      pool.filter((a) => !a.deletedAt),
      inspected.canonicalUrl,
      inspected.externalId,
      inspected.platform
    );
    return ok({
      ...inspected,
      duplicate,
      potentialDuplicates: [],
    });
  } catch (error) {
    return fromError(error, {
      url,
      canonicalUrl: url,
      platform: "unknown",
      adType: "unknown",
      externalId: null,
      validationStatus: "invalid",
      validationMessage: "We couldn’t validate this advertisement link.",
      duplicate: null,
      potentialDuplicates: [],
    });
  }
}

export async function getOrganicAds(
  filters: OrganicAdsFilters = {}
): Promise<ApiResponse<PaginatedAds>> {
  try {
    if (isApiMode()) return fetchOrganicAds(filters);
    await simulateDelay();
    assertCap("view_own");
    const ads = filterAds(await scopedAds(), filters);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
    const total = ads.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return ok({
      items: ads.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    return fromError(error, {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  }
}

export async function getOrganicAdById(
  id: string
): Promise<ApiResponse<OrganicAdvertisement | null>> {
  try {
    if (isApiMode()) return fetchOrganicAdById(id);
    await simulateDelay();
    assertCap("view_own");
    const ads = await scopedAds();
    const found = ads.find((a) => a.id === id) ?? null;
    if (!found) throw new NotFoundError("Advertisement not found");
    return ok(found);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function listLinkableOrganicAdTasks(
  employeeId?: string
): Promise<ApiResponse<LinkableWorkTask[]>> {
  try {
    if (isApiMode()) return fetchLinkableOrganicAdTasks(employeeId);
    await simulateDelay();
    assertCap("view_own");
    const ownerId = employeeId || getWorkEmployeeId();
    if (!ownerId) return ok([]);
    const claimed = await claimedTaskIds();
    const tasks = (await workTaskRepository.findAll()).filter(
      (t) =>
        !t.deletedAt &&
        !!t.targetId &&
        t.status !== "completed" &&
        t.assigneeIds.includes(ownerId) &&
        !claimed.has(t.id)
    );
    const { performanceTargetRepository } = await import("@/repositories");
    const targets = await performanceTargetRepository.findAll();
    const targetMap = new Map(targets.map((t) => [t.id, t]));

    return ok(
      tasks.map((t) => {
        const target = t.targetId ? targetMap.get(t.targetId) : undefined;
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate ?? "",
          tag: t.tag,
          targetId: t.targetId ?? null,
          targetTitle: target?.title ?? "",
          targetQuantity: target?.quantity ?? 0,
          targetCompleted: target?.completedQuantity ?? 0,
          targetStatus: target?.status ?? "",
        };
      })
    );
  } catch (error) {
    return fromError(error, []);
  }
}

export async function getOrganicAdHistory(
  limit = 40
): Promise<ApiResponse<OrganicAdHistoryEvent[]>> {
  try {
    await simulateDelay();
    assertCap("view_own");
    const history = await organicAdHistoryRepository.latest(limit);
    if (canOrganicAds(getSessionRole(), "view_audit")) {
      return ok(history);
    }
    const mine = getWorkEmployeeId();
    return ok(
      history.filter(
        (h) => h.actorId === mine || h.actorId === getSessionUserId()
      )
    );
  } catch (error) {
    return fromError(error, []);
  }
}
