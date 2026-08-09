import { enrichWithAudit } from "@/lib/entity";
import { subHours, subMinutes } from "date-fns";
import type { OrganicAdHistoryEvent, OrganicAdsSettings } from "@/types/organic-ads";

const ACTOR = "user-admin";
const now = new Date();

export const organicAdsSettingsSeed: OrganicAdsSettings = enrichWithAudit(
  {
    id: "organic-ads-settings",
    weeklyTarget: 3,
    allowDuplicateOverride: true,
  },
  ACTOR
);

export const organicAdHistorySeed: OrganicAdHistoryEvent[] = [
  enrichWithAudit(
    {
      id: "oadh-001",
      advertisementId: "oad-011",
      action: "created",
      actorId: "emp-013",
      actorName: "Dina Mahmoud",
      note: "Added an Instagram Story",
      previousValue: null,
      newValue: "active",
    },
    "emp-013",
    {
      createdAt: subMinutes(now, 2).toISOString(),
      updatedAt: subMinutes(now, 2).toISOString(),
    }
  ),
  enrichWithAudit(
    {
      id: "oadh-002",
      advertisementId: "oad-004",
      action: "created",
      actorId: "emp-010",
      actorName: "Faisal Qureshi",
      note: "Added an Instagram Post",
      previousValue: null,
      newValue: "active",
    },
    "emp-010",
    {
      createdAt: subMinutes(now, 14).toISOString(),
      updatedAt: subMinutes(now, 14).toISOString(),
    }
  ),
  enrichWithAudit(
    {
      id: "oadh-003",
      advertisementId: "oad-005",
      action: "marked_duplicate",
      actorId: ACTOR,
      actorName: "Admin",
      note: "Marked as duplicate of oad-004",
      previousValue: "active",
      newValue: "duplicate",
    },
    ACTOR,
    {
      createdAt: subHours(now, 3).toISOString(),
      updatedAt: subHours(now, 3).toISOString(),
    }
  ),
  enrichWithAudit(
    {
      id: "oadh-004",
      advertisementId: "oad-009",
      action: "status_changed",
      actorId: "emp-005",
      actorName: "Omar Khalil",
      note: "Marked inactive",
      previousValue: "active",
      newValue: "inactive",
    },
    "emp-005",
    {
      createdAt: subHours(now, 20).toISOString(),
      updatedAt: subHours(now, 20).toISOString(),
    }
  ),
];
