/**
 * Shared Organic Ads ↔ WorkTask / TargetType matching.
 * Used so adding an advertisement only completes ads-quota work.
 */

export const ORGANIC_ADS_TYPE_NAME = "Organic Ads";
export const ORGANIC_ADS_UNIT = "ads";
export const ORGANIC_ADS_TAG = "Organic Ads";
export const ORGANIC_ADS_TASK_TITLE_TEMPLATE = "Organic Ad #{n}";
export const ORGANIC_ADS_MAX_QUANTITY = 50;

const ADS_TEXT_RE =
  /(?:organic\s*ads?|\bads?\b|إعلانات|اعلانات|إعلان|اعلان)/i;

export interface OrganicAdsTypeLike {
  id?: string | null;
  name?: string | null;
  unit?: string | null;
  metadata?: unknown;
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

function metadataFlag(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  return (metadata as Record<string, unknown>).organicAds === true;
}

export function isOrganicAdsType(type: OrganicAdsTypeLike | null | undefined): boolean {
  if (!type) return false;
  if (metadataFlag(type.metadata)) return true;
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
