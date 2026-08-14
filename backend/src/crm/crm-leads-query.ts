/** Pure Prisma where-clause builder for lead listing/filtering. */
import { CrmLeadSource, CrmLeadStatus, type Prisma } from "@prisma/client";
import { endOfDay } from "date-fns";
import { canViewOthersLeads, type Actor } from "./crm-access";
import { LEAD_SOURCES, LEAD_STATUSES } from "./crm-input";
import { CrmSharedService } from "./crm-shared.service";

export function buildLeadWhere(
  shared: CrmSharedService,
  companyId: string,
  actor: Actor,
  query: Record<string, string | undefined>
): Prisma.CrmLeadWhereInput {
  const where: Prisma.CrmLeadWhereInput = {
    companyId,
    deletedAt: null,
    ...shared.scopeOwnerFilter(actor),
  };

  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
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
  if (query.ownerEmployeeId && canViewOthersLeads(actor)) {
    where.ownerEmployeeId = query.ownerEmployeeId;
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
