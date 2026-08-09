/**
 * Organic Ads HTTP client — ready for Nest module wiring.
 * Frontend V1 uses local repositories via `organic-ads.service.ts`.
 */
import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse } from "@/types";
import type {
  CreateOrganicAdInput,
  DateRangePreset,
  OrganicAdsFilters,
  OrganicAdsOverview,
  OrganicAdsSettings,
  OrganicAdvertisement,
  PaginatedAds,
  SalesAdvertisingProfile,
  SalesPerformanceRow,
  TeamActivitySort,
  LinkableWorkTask,
  UpdateOrganicAdInput,
  UrlInspectionResult,
} from "@/types/organic-ads";

const emptyOverview = (): OrganicAdsOverview => ({
  kpis: {
    totalAds: 0,
    activeAds: 0,
    adsInPeriod: 0,
    salesParticipating: 0,
    needsAttention: 0,
  },
  teamActivity: [],
  needsAttention: [],
  weeklyActivity: [],
  platforms: [],
  recentActivity: [],
  settings: {
    id: "",
    weeklyTarget: 3,
    allowDuplicateOverride: false,
    companyId: "",
    createdAt: "",
    updatedAt: "",
    createdBy: "",
    updatedBy: "",
    deletedAt: null,
    isArchived: false,
    version: 1,
    metadata: {},
  },
  range: "this_week",
});

const emptyPage = (): PaginatedAds => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
});

export async function fetchOrganicAdsOverview(
  range: DateRangePreset = "this_week",
  activitySort: TeamActivitySort = "ads"
): Promise<ApiResponse<OrganicAdsOverview>> {
  return api.get(
    `${API_ROUTES.organicAds.overview}${toQuery({ range, activitySort })}`,
    emptyOverview()
  );
}

export async function fetchOrganicAds(
  filters: OrganicAdsFilters = {}
): Promise<ApiResponse<PaginatedAds>> {
  return api.get(
    `${API_ROUTES.organicAds.root}${toQuery({
      search: filters.search,
      ownerEmployeeId: filters.ownerEmployeeId,
      platform: filters.platform || undefined,
      project: filters.project,
      status: filters.status || undefined,
      validationStatus: filters.validationStatus || undefined,
      duplicateOnly: filters.duplicateOnly,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      range: filters.range,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    })}`,
    emptyPage()
  );
}

export async function fetchOrganicAdById(
  id: string
): Promise<ApiResponse<OrganicAdvertisement | null>> {
  return api.get(API_ROUTES.organicAds.byId(id), null);
}

export async function postInspectOrganicAdUrl(
  url: string
): Promise<ApiResponse<UrlInspectionResult>> {
  return api.post(
    API_ROUTES.organicAds.inspect,
    { url },
    {
      url,
      canonicalUrl: url,
      platform: "unknown",
      adType: "unknown",
      externalId: null,
      validationStatus: "invalid",
      validationMessage: "",
      duplicate: null,
      potentialDuplicates: [],
    }
  );
}

export async function postOrganicAd(
  input: CreateOrganicAdInput
): Promise<ApiResponse<OrganicAdvertisement | null>> {
  return api.post(API_ROUTES.organicAds.root, input, null);
}

export async function patchOrganicAd(
  id: string,
  input: UpdateOrganicAdInput
): Promise<ApiResponse<OrganicAdvertisement | null>> {
  return api.patch(API_ROUTES.organicAds.byId(id), input, null);
}

export async function deleteOrganicAdRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.organicAds.byId(id), false);
}

export async function fetchOrganicAdsPerformance(): Promise<
  ApiResponse<SalesPerformanceRow[]>
> {
  return api.get(API_ROUTES.organicAds.performance, []);
}

export async function fetchSalesAdvertisingProfile(
  employeeId: string
): Promise<ApiResponse<SalesAdvertisingProfile | null>> {
  return api.get(API_ROUTES.organicAds.profile(employeeId), null);
}

export async function patchOrganicAdsSettings(
  input: Pick<OrganicAdsSettings, "weeklyTarget" | "allowDuplicateOverride">
): Promise<ApiResponse<OrganicAdsSettings | null>> {
  return api.patch(API_ROUTES.organicAds.settings, input, null);
}

export async function fetchLinkableOrganicAdTasks(
  employeeId?: string
): Promise<ApiResponse<LinkableWorkTask[]>> {
  return api.get(
    `${API_ROUTES.organicAds.linkableTasks}${toQuery({ employeeId })}`,
    []
  );
}
