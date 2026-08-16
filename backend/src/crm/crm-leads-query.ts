/** Pure Prisma where-clause builder for lead listing/filtering. */
import { CrmLeadSource, CrmLeadStatus, type Prisma } from "@prisma/client";
import { endOfDay } from "date-fns";
import type { Actor } from "./crm-access";
import { LEAD_SOURCES, LEAD_STATUSES } from "./crm-input";
import { CrmSharedService } from "./crm-shared.service";
import { extractHandle, looksLikeHandle } from "../lib/contact-identity";
import { searchCanonicalFromQuery } from "./crm-phone";

export function buildLeadWhere(
  shared: CrmSharedService,
  companyId: string,
  actor: Actor,
  query: Record<string, string | undefined>,
  ownerIds: string[] | null
): Prisma.CrmLeadWhereInput {
  const where: Prisma.CrmLeadWhereInput = {
    companyId,
    deletedAt: null,
    ...shared.scopeOwnerFilter(actor, ownerIds),
  };

  if (query.search?.trim()) {
    const q = query.search.trim();
    const canonical = searchCanonicalFromQuery(q);
    const digits = q.replace(/\D/g, "");
    const phoneOr: Prisma.CrmLeadWhereInput[] = canonical
      ? [{ phoneNormalized: canonical }]
      : [{ phone: { contains: q, mode: "insensitive" } }];
    if (digits.length >= 3) {
      phoneOr.push({
        phoneNormalized: { contains: digits, mode: "insensitive" },
      });
      if (!canonical) {
        phoneOr.push({
          phone: { contains: digits, mode: "insensitive" },
        });
      }
    }
    const handle = extractHandle(q);
    if (looksLikeHandle(q) && handle) {
      phoneOr.push({
        phoneNormalized: { contains: `:${handle}`, mode: "insensitive" },
      });
      phoneOr.push({
        phone: { contains: handle, mode: "insensitive" },
      });
    }
    phoneOr.push({
      metadata: { path: ["contactSearch"], string_contains: q.toLowerCase() },
    });
    if (canonical) {
      phoneOr.push({
        metadata: { path: ["contactKeys"], array_contains: canonical },
      });
    }
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      ...phoneOr,
    ];
  }
  if (query.stageId) where.stageId = query.stageId;
  if (query.subStageId) where.subStageId = query.subStageId;
  if (query.status && LEAD_STATUSES.has(query.status)) {
    where.status = query.status as CrmLeadStatus;
  }
  if (query.source && LEAD_SOURCES.has(query.source)) {
    where.source = query.source as CrmLeadSource;
  }
  if (query.ownerEmployeeId) {
    Object.assign(where, shared.extraOwnerFilter(ownerIds, query.ownerEmployeeId));
  }
  if (query.tag) where.tags = { has: query.tag };

  const now = new Date();
  const endToday = endOfDay(now);
  if (query.followUp === "today") {
    // Still due later today (not yet past the scheduled minute).
    where.nextFollowUpAt = { gt: now, lte: endToday };
  } else if (query.followUp === "upcoming") {
    where.nextFollowUpAt = { gt: endToday };
  } else if (query.followUp === "overdue") {
    // Delay face: scheduled next-action time has already passed.
    where.nextFollowUpAt = { lte: now };
    if (!query.status) where.status = CrmLeadStatus.active;
  } else if (query.followUp === "none") {
    where.nextFollowUpAt = null;
  }

  return where;
}
