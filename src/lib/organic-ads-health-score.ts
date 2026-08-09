import { differenceInCalendarDays, parseISO } from "date-fns";
import type { OrganicAdvertisement } from "@/types/organic-ads";
import { isInRange } from "./organic-ads-date-range";

export function computeHealthScore(
  ads: OrganicAdvertisement[],
  weeklyTarget: number,
  now = new Date()
): number {
  if (ads.length === 0) return 0;

  const active = ads.filter((a) => a.status === "active").length;
  const duplicates = ads.filter(
    (a) => a.status === "duplicate" || a.duplicateOfId
  ).length;
  const invalid = ads.filter(
    (a) =>
      a.validationStatus === "invalid" ||
      a.validationStatus === "broken" ||
      a.validationStatus === "unsupported"
  ).length;
  const weekly = ads.filter((a) => isInRange(a.addedAt, "this_week", now)).length;
  const last = ads
    .map((a) => parseISO(a.addedAt).getTime())
    .sort((a, b) => b - a)[0];
  const daysSince = last
    ? differenceInCalendarDays(now, new Date(last))
    : 30;

  let score = 40;
  score += Math.min(25, (active / Math.max(ads.length, 1)) * 25);
  score += Math.min(20, (weekly / Math.max(weeklyTarget, 1)) * 20);
  if (daysSince <= 2) score += 15;
  else if (daysSince <= 5) score += 8;
  else if (daysSince > 7) score -= 15;
  score -= Math.min(20, duplicates * 6);
  score -= Math.min(20, invalid * 8);

  return Math.max(0, Math.min(100, Math.round(score)));
}
