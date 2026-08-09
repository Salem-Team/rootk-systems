import type { BaseEntity } from "@/types";

export type AdPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "other"
  | "unknown";

export type AdType =
  | "post"
  | "reel"
  | "video"
  | "story"
  | "profile_post"
  | "other"
  | "unknown";

export type AdStatus = "active" | "inactive" | "needs_review" | "duplicate";

export type AdValidationStatus =
  | "valid"
  | "invalid"
  | "broken"
  | "unsupported"
  | "pending";

export type OrganicAdsCapability =
  | "view_own"
  | "view_team"
  | "create"
  | "edit_own"
  | "edit_team"
  | "delete_own"
  | "delete_team"
  | "view_performance"
  | "view_validation"
  | "override_duplicate"
  | "manage_settings"
  | "view_audit";

export type AttentionSeverity = "critical" | "warning" | "info";

export type AttentionKind =
  | "inactive"
  | "duplicate"
  | "invalid_links"
  | "stale"
  | "below_target";

export type OrganicAdHistoryAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "marked_duplicate"
  | "override_duplicate"
  | "validated";

export type DateRangePreset = "this_week" | "last_7_days" | "this_month" | "all";

export type TeamActivitySort = "ads" | "last_activity";

export interface OrganicAdvertisement extends BaseEntity {
  id: string;
  ownerEmployeeId: string;
  platform: AdPlatform;
  adType: AdType;
  url: string;
  canonicalUrl: string;
  externalId: string | null;
  project: string;
  campaign: string;
  notes: string;
  status: AdStatus;
  validationStatus: AdValidationStatus;
  validationMessage: string;
  duplicateOfId: string | null;
  /** Future-ready: content similarity score 0–100 when AI is available. */
  similarityScore: number | null;
  addedAt: string;
  lastVerifiedAt: string | null;
  /** Optional attribution — only set when a trustworthy source exists. */
  leadsCount: number | null;
  qualifiedLeadsCount: number | null;
  dealsCount: number | null;
  /** Linked WorkTask — completing it advances PerformanceTarget progress. */
  workTaskId: string | null;
  targetId: string | null;
}

export interface OrganicAdsSettings extends BaseEntity {
  id: string;
  weeklyTarget: number;
  allowDuplicateOverride: boolean;
}

export interface OrganicAdHistoryEvent extends BaseEntity {
  id: string;
  advertisementId: string | null;
  action: OrganicAdHistoryAction;
  actorId: string;
  actorName: string;
  note: string;
  previousValue: string | null;
  newValue: string | null;
}

export interface OrganicAdsFilters {
  search?: string;
  ownerEmployeeId?: string;
  platform?: AdPlatform | "";
  project?: string;
  status?: AdStatus | "";
  validationStatus?: AdValidationStatus | "";
  duplicateOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  range?: DateRangePreset;
  page?: number;
  pageSize?: number;
  sortBy?: "addedAt" | "platform" | "status" | "owner";
  sortDir?: "asc" | "desc";
}

export interface OrganicAdsKpis {
  totalAds: number;
  activeAds: number;
  adsInPeriod: number;
  salesParticipating: number;
  needsAttention: number;
}

export interface TeamActivityRow {
  employeeId: string;
  name: string;
  adsCount: number;
  activeCount: number;
  lastActivityAt: string | null;
  weeklyCount: number;
  weeklyTarget: number;
  healthScore: number;
}

export interface NeedsAttentionItem {
  id: string;
  severity: AttentionSeverity;
  kind: AttentionKind;
  employeeId: string | null;
  employeeName: string;
  advertisementId: string | null;
  title: string;
  description: string;
  href: string;
}

export interface WeeklyActivityPoint {
  date: string;
  label: string;
  count: number;
}

export interface PlatformBreakdownRow {
  platform: AdPlatform;
  count: number;
  activeSales: number;
  projects: number;
}

export interface SalesPerformanceRow {
  employeeId: string;
  name: string;
  department: string;
  ads: number;
  active: number;
  platforms: number;
  weeklyCount: number;
  weeklyTarget: number;
  healthScore: number;
  lastActivityAt: string | null;
  /** Shown only when attribution data exists. */
  leads: number | null;
  qualified: number | null;
  deals: number | null;
  conversionRate: number | null;
}

export interface SalesAdvertisingProfile {
  employeeId: string;
  name: string;
  department: string;
  totalAds: number;
  activeAds: number;
  platformsUsed: number;
  adsThisWeek: number;
  healthScore: number;
  weeklyTarget: number;
  platformCounts: { platform: AdPlatform; count: number }[];
  recentAds: OrganicAdvertisement[];
  leads: number | null;
  qualified: number | null;
  deals: number | null;
  linkedTargets?: LinkedTargetProgress[];
}

export interface UrlInspectionResult {
  url: string;
  canonicalUrl: string;
  platform: AdPlatform;
  adType: AdType;
  externalId: string | null;
  validationStatus: AdValidationStatus;
  validationMessage: string;
  duplicate: OrganicAdvertisement | null;
  /** Reserved for future content-similarity checks. */
  potentialDuplicates: never[];
}

export interface CreateOrganicAdInput {
  url: string;
  project?: string;
  campaign?: string;
  notes?: string;
  /** Admin-only override when an exact duplicate exists. */
  forceDuplicate?: boolean;
  /** Explicit WorkTask to complete (must be open + target-linked). */
  workTaskId?: string;
  /** Prefer open tasks under this PerformanceTarget. */
  targetId?: string;
  /** Auto-link next open target task (default true). */
  linkToOpenTask?: boolean;
}

export interface LinkedTargetProgress {
  id: string;
  title: string;
  quantity: number;
  completedQuantity: number;
  remaining: number;
  status: string;
  health: string;
  assigneeIds?: string[];
  typeName?: string;
  unit?: string;
}

export interface LinkableWorkTask {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  tag: string;
  targetId: string | null;
  targetTitle: string;
  targetQuantity: number;
  targetCompleted: number;
  targetStatus: string;
}

export interface UpdateOrganicAdInput {
  project?: string;
  campaign?: string;
  notes?: string;
  status?: AdStatus;
}

export interface OrganicAdsOverview {
  kpis: OrganicAdsKpis;
  teamActivity: TeamActivityRow[];
  needsAttention: NeedsAttentionItem[];
  weeklyActivity: WeeklyActivityPoint[];
  platforms: PlatformBreakdownRow[];
  recentActivity: OrganicAdHistoryEvent[];
  settings: OrganicAdsSettings;
  range: DateRangePreset;
  /** Targets advanced by organic ads via linked WorkTasks. */
  linkedTargets?: LinkedTargetProgress[];
}

export interface PaginatedAds {
  items: OrganicAdvertisement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
