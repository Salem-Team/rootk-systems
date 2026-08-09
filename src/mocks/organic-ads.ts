import { enrichWithAudit } from "@/lib/entity";
import { normalizeAdUrl } from "@/lib/organic-ads-url";
import { subDays } from "date-fns";
import type { OrganicAdvertisement } from "@/types/organic-ads";

export {
  organicAdHistorySeed,
  organicAdsSettingsSeed,
} from "./organic-ads-activity";

const ACTOR = "user-admin";
const now = new Date();

function at(daysAgo: number, hours = 10): string {
  const d = subDays(now, daysAgo);
  d.setHours(hours, 15, 0, 0);
  return d.toISOString();
}

type AdSeed = Omit<
  OrganicAdvertisement,
  | "companyId"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "updatedBy"
  | "deletedAt"
  | "isArchived"
  | "version"
  | "metadata"
  | "canonicalUrl"
  | "leadsCount"
  | "qualifiedLeadsCount"
  | "dealsCount"
  | "similarityScore"
  | "workTaskId"
  | "targetId"
> & { canonicalUrl?: string };

function ad(partial: AdSeed): OrganicAdvertisement {
  const canonicalUrl = partial.canonicalUrl ?? normalizeAdUrl(partial.url);
  return enrichWithAudit(
    {
      ...partial,
      canonicalUrl,
      leadsCount: null,
      qualifiedLeadsCount: null,
      dealsCount: null,
      similarityScore: null,
      workTaskId: null,
      targetId: null,
    },
    ACTOR,
    {
      createdAt: partial.addedAt,
      updatedAt: partial.addedAt,
    }
  );
}

/** Demo organic ads for Sales / Marketing owners. */
export const organicAdsSeed: OrganicAdvertisement[] = [
  ad({
    id: "oad-001",
    ownerEmployeeId: "emp-013",
    platform: "instagram",
    adType: "reel",
    url: "https://www.instagram.com/reel/CxDemoDina01/",
    externalId: "CxDemoDina01",
    project: "XYZ Residence",
    campaign: "August Launch",
    notes: "Primary reel for launch week",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(0, 9),
    lastVerifiedAt: at(0, 9),
  }),
  ad({
    id: "oad-002",
    ownerEmployeeId: "emp-013",
    platform: "facebook",
    adType: "post",
    url: "https://www.facebook.com/posts/100200300401/",
    externalId: "100200300401",
    project: "XYZ Residence",
    campaign: "August Launch",
    notes: "",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(1, 11),
    lastVerifiedAt: at(1, 11),
  }),
  ad({
    id: "oad-003",
    ownerEmployeeId: "emp-013",
    platform: "tiktok",
    adType: "video",
    url: "https://www.tiktok.com/@rootk/video/7300000000000000001",
    externalId: "7300000000000000001",
    project: "Nile Towers",
    campaign: "",
    notes: "",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(2, 14),
    lastVerifiedAt: at(2, 14),
  }),
  ad({
    id: "oad-004",
    ownerEmployeeId: "emp-010",
    platform: "instagram",
    adType: "post",
    url: "https://www.instagram.com/p/CxDemoFaisal01/",
    externalId: "CxDemoFaisal01",
    project: "XYZ Residence",
    campaign: "Growth",
    notes: "",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(0, 12),
    lastVerifiedAt: at(0, 12),
  }),
  ad({
    id: "oad-005",
    ownerEmployeeId: "emp-010",
    platform: "instagram",
    adType: "post",
    url: "https://instagram.com/p/CxDemoFaisal01/?utm_source=share",
    externalId: "CxDemoFaisal01",
    project: "XYZ Residence",
    campaign: "Growth",
    notes: "Same post, different URL format",
    status: "duplicate",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: "oad-004",
    addedAt: at(0, 13),
    lastVerifiedAt: at(0, 13),
  }),
  ad({
    id: "oad-006",
    ownerEmployeeId: "emp-010",
    platform: "facebook",
    adType: "video",
    url: "https://www.facebook.com/watch/?v=5500112233",
    externalId: "5500112233",
    project: "Nile Towers",
    campaign: "",
    notes: "",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(3, 10),
    lastVerifiedAt: at(3, 10),
  }),
  ad({
    id: "oad-007",
    ownerEmployeeId: "emp-011",
    platform: "linkedin",
    adType: "post",
    url: "https://www.linkedin.com/posts/rootk-demo-activity-7123456789012345678",
    externalId: "rootk-demo-activity-7123456789012345678",
    project: "Corporate",
    campaign: "B2B",
    notes: "",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(1, 16),
    lastVerifiedAt: at(1, 16),
  }),
  ad({
    id: "oad-008",
    ownerEmployeeId: "emp-011",
    platform: "other",
    adType: "unknown",
    url: "https://example.com/promo/broken-link",
    externalId: null,
    project: "Corporate",
    campaign: "",
    notes: "Needs replacement",
    status: "needs_review",
    validationStatus: "unsupported",
    validationMessage: "This platform is not currently supported",
    duplicateOfId: null,
    addedAt: at(4, 9),
    lastVerifiedAt: at(4, 9),
  }),
  ad({
    id: "oad-009",
    ownerEmployeeId: "emp-005",
    platform: "facebook",
    adType: "post",
    url: "https://www.facebook.com/posts/9988776655/",
    externalId: "9988776655",
    project: "XYZ Residence",
    campaign: "",
    notes: "",
    status: "inactive",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(9, 11),
    lastVerifiedAt: at(9, 11),
  }),
  ad({
    id: "oad-010",
    ownerEmployeeId: "emp-003",
    platform: "tiktok",
    adType: "video",
    url: "https://www.tiktok.com/@rootk/video/not-a-real-id",
    externalId: null,
    project: "Nile Towers",
    campaign: "",
    notes: "",
    status: "needs_review",
    validationStatus: "broken",
    validationMessage: "This advertisement could not be verified",
    duplicateOfId: null,
    addedAt: at(6, 15),
    lastVerifiedAt: at(6, 15),
  }),
  ad({
    id: "oad-011",
    ownerEmployeeId: "emp-013",
    platform: "instagram",
    adType: "story",
    url: "https://www.instagram.com/stories/rootk/29000112233/",
    externalId: "29000112233",
    project: "XYZ Residence",
    campaign: "Stories",
    notes: "",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(0, 17),
    lastVerifiedAt: at(0, 17),
  }),
  ad({
    id: "oad-012",
    ownerEmployeeId: "emp-010",
    platform: "facebook",
    adType: "reel",
    url: "https://www.facebook.com/reel/4400221133",
    externalId: "4400221133",
    project: "Nile Towers",
    campaign: "Reels",
    notes: "",
    status: "active",
    validationStatus: "valid",
    validationMessage: "Valid advertisement link",
    duplicateOfId: null,
    addedAt: at(2, 8),
    lastVerifiedAt: at(2, 8),
  }),
];
