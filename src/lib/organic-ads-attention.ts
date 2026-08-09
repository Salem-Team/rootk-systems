import { differenceInCalendarDays, parseISO } from "date-fns";
import type {
  AttentionKind,
  AttentionSeverity,
  NeedsAttentionItem,
  OrganicAdsSettings,
  OrganicAdvertisement,
} from "@/types/organic-ads";
import { isInRange } from "./organic-ads-date-range";

export function buildNeedsAttention(
  ads: OrganicAdvertisement[],
  settings: Pick<OrganicAdsSettings, "weeklyTarget">,
  now = new Date(),
  employeeNames: Map<string, string> = new Map()
): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];
  const byOwner = new Map<string, OrganicAdvertisement[]>();
  for (const ad of ads) {
    const list = byOwner.get(ad.ownerEmployeeId) ?? [];
    list.push(ad);
    byOwner.set(ad.ownerEmployeeId, list);
  }

  for (const [employeeId, list] of byOwner) {
    const name = employeeNames.get(employeeId) ?? "Sales";
    const last = list
      .map((a) => a.addedAt)
      .sort((a, b) => b.localeCompare(a))[0];
    const days = last
      ? differenceInCalendarDays(now, parseISO(last))
      : 99;
    const weekly = list.filter((a) =>
      isInRange(a.addedAt, "this_week", now)
    ).length;
    const dupes = list.filter(
      (a) => a.status === "duplicate" || a.duplicateOfId
    );
    const invalid = list.filter(
      (a) =>
        a.validationStatus === "invalid" ||
        a.validationStatus === "broken" ||
        a.validationStatus === "unsupported"
    );

    if (days >= 6) {
      const severity: AttentionSeverity = days >= 9 ? "critical" : "warning";
      const kind: AttentionKind = days >= 9 ? "stale" : "inactive";
      items.push({
        id: `attn-inactive-${employeeId}`,
        severity,
        kind,
        employeeId,
        employeeName: name,
        advertisementId: null,
        title: name,
        description:
          days >= 9
            ? `Last advertisement ${days} days ago`
            : `No new advertisement for ${days} days`,
        href: `/organic-ads?tab=performance&employeeId=${employeeId}`,
      });
    }

    if (dupes.length > 0) {
      items.push({
        id: `attn-dupe-${employeeId}`,
        severity: "warning",
        kind: "duplicate",
        employeeId,
        employeeName: name,
        advertisementId: dupes[0]?.id ?? null,
        title: name,
        description: `${dupes.length} duplicate advertisement${dupes.length === 1 ? "" : "s"} detected`,
        href: `/organic-ads?tab=validation&filter=duplicate&employeeId=${employeeId}`,
      });
    }

    if (invalid.length > 0) {
      items.push({
        id: `attn-invalid-${employeeId}`,
        severity: "warning",
        kind: "invalid_links",
        employeeId,
        employeeName: name,
        advertisementId: invalid[0]?.id ?? null,
        title: name,
        description: `${invalid.length} invalid advertisement link${invalid.length === 1 ? "" : "s"}`,
        href: `/organic-ads?tab=validation&filter=invalid&employeeId=${employeeId}`,
      });
    }

    if (weekly < settings.weeklyTarget) {
      items.push({
        id: `attn-target-${employeeId}`,
        severity: weekly === 0 ? "critical" : "info",
        kind: "below_target",
        employeeId,
        employeeName: name,
        advertisementId: null,
        title: name,
        description: `${weekly} / ${settings.weeklyTarget} weekly ads`,
        href: `/organic-ads?tab=performance&employeeId=${employeeId}`,
      });
    }
  }

  const order: Record<AttentionSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}
