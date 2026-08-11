/**
 * Shared Organic Ads ↔ WorkTask / TargetType matching.
 * Used so adding an advertisement only completes ads-quota work.
 */

export const ORGANIC_ADS_TYPE_NAME = "Organic Ads";
export const ORGANIC_ADS_UNIT = "ads";
export const ORGANIC_ADS_TAG = "Organic Ads";
export const ORGANIC_ADS_TASK_TITLE_TEMPLATE = "Organic Ad #{n}";
export const ORGANIC_ADS_LOCAL_TYPE_ID = "ttype-organic-ads";
export const ORGANIC_ADS_LOCAL_CATEGORY_ID = "tcat-mkt";
export const ORGANIC_ADS_LOCAL_TEMPLATE_ID = "ttpl-organic-ads-weekly";
export const ORGANIC_ADS_MAX_QUANTITY = 50;

const ADS_TEXT_RE =
  /(?:organic\s*ads?|\bads?\b|إعلانات|اعلانات|إعلان|اعلان)/i;

export interface OrganicAdsTypeLike {
  id?: string | null;
  name?: string | null;
  unit?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface OrganicAdsTaskLike {
  tag?: string | null;
  title?: string | null;
}

function hay(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function isOrganicAdsType(type: OrganicAdsTypeLike | null | undefined): boolean {
  if (!type) return false;
  if (type.id === ORGANIC_ADS_LOCAL_TYPE_ID) return true;
  if (type.metadata && type.metadata.organicAds === true) return true;
  const unit = (type.unit ?? "").trim().toLowerCase();
  if (unit === ORGANIC_ADS_UNIT || unit === "ad" || unit === "إعلان") return true;
  return ADS_TEXT_RE.test(hay(type.name, type.unit));
}

export function isOrganicAdsTaskText(task: OrganicAdsTaskLike): boolean {
  return ADS_TEXT_RE.test(hay(task.tag, task.title));
}

export function isOrganicAdsLinkableTask(
  task: OrganicAdsTaskLike,
  type?: OrganicAdsTypeLike | null
): boolean {
  return isOrganicAdsType(type) || isOrganicAdsTaskText(task);
}

export function taskTagForTargetType(type: OrganicAdsTypeLike): string {
  if (isOrganicAdsType(type)) return ORGANIC_ADS_TAG;
  return (type.name ?? "").trim();
}

export function clampOrganicAdsQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(ORGANIC_ADS_MAX_QUANTITY, Math.max(1, Math.floor(value)));
}
