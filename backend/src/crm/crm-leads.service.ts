import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CrmLeadStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { writeActivity } from "../common/activity-writer";
import { assertCap, isAdmin, type Actor } from "./crm-access";
import {
  clampPage,
  clampPageSize,
  DEFAULT_LEADS_PAGE_SIZE,
} from "./crm-defaults";
import { buildLeadWhere } from "./crm-leads-query";
import { CrmLeadUpdateService } from "./crm-lead-update.service";
import { mapLead } from "./crm-mappers";
import { CrmSharedService } from "./crm-shared.service";

const LEAD_SORT_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "name",
  "nextFollowUpAt",
  "lastActivityAt",
]);

const BULK_ACTIONS = ["assign", "change_stage", "change_status", "archive"];

@Injectable()
export class CrmLeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService,
    private readonly updateService: CrmLeadUpdateService
  ) {}

  async listLeads(
    companyId: string,
    actor: Actor,
    query: Record<string, string | undefined>
  ) {
    assertCap(actor, "view");
    await this.shared.ensureDefaultStages(companyId);

    const page = clampPage(Number(query.page) || 1);
    const pageSize = clampPageSize(
      Number(query.pageSize),
      DEFAULT_LEADS_PAGE_SIZE
    );
    const sort = query.sort ?? "createdAt";
    const order = query.order === "asc" ? "asc" : "desc";
    const sortKey = LEAD_SORT_KEYS.has(sort) ? sort : "createdAt";

    const where = buildLeadWhere(this.shared, companyId, actor, query);
    const [total, rows] = await Promise.all([
      this.prisma.crmLead.count({ where }),
      this.prisma.crmLead.findMany({
        where,
        orderBy: { [sortKey]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapLead),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getLead(companyId: string, actor: Actor, id: string) {
    const lead = await this.shared.requireLead(companyId, actor, id);
    return mapLead(lead);
  }

  async deleteLead(companyId: string, actor: Actor, id: string) {
    const lead = await this.shared.requireLead(companyId, actor, id);
    const isOwner = lead.ownerEmployeeId === actor.employeeId;
    if (!isAdmin(actor) && !isOwner) {
      throw new ForbiddenException("You can only delete your own leads");
    }
    if (isAdmin(actor)) assertCap(actor, "delete");
    // owners may soft-delete without admin delete capability

    await this.prisma.crmLead.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
        status: CrmLeadStatus.archived,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    await this.shared.writeHistory(companyId, {
      leadId: id,
      action: "lead_deleted",
      actorId: actor.userId,
      actorName: await this.shared.actorName(actor),
      note: `Deleted lead ${lead.name}`,
      previousValue: lead.name,
    });
    await writeActivity(this.prisma, {
      companyId,
      type: "crm_lead_deleted",
      title: "CRM lead deleted",
      description: lead.name,
      employeeId: lead.ownerEmployeeId ?? undefined,
      actorId: actor.userId,
    });

    return { ok: true };
  }

  async bulkLeads(
    companyId: string,
    actor: Actor,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "edit");
    const ids = Array.isArray(body.ids) ? body.ids.map((v) => String(v)) : [];
    const action = String(body.action ?? "");
    const value = body.value;

    if (ids.length === 0) throw new BadRequestException("ids are required");
    if (!BULK_ACTIONS.includes(action)) {
      throw new BadRequestException("Invalid bulk action");
    }
    if (action === "assign") assertCap(actor, "assign");

    const leads = await this.prisma.crmLead.findMany({
      where: {
        companyId,
        deletedAt: null,
        id: { in: ids },
        ...this.shared.scopeOwnerFilter(actor),
      },
    });
    if (leads.length === 0) throw new NotFoundException("No leads found");

    let updated = 0;
    for (const lead of leads) {
      await this.applyBulkAction(companyId, actor, lead.id, action, value, body);
      updated += 1;
    }

    return { ok: true, updated };
  }

  private async applyBulkAction(
    companyId: string,
    actor: Actor,
    leadId: string,
    action: string,
    value: unknown,
    body: Record<string, unknown>
  ) {
    if (action === "assign") {
      await this.updateService.updateLead(companyId, actor, leadId, {
        ownerEmployeeId: typeof value === "string" ? value : null,
      });
    } else if (action === "change_stage") {
      await this.updateService.updateLead(companyId, actor, leadId, {
        stageId: String(value ?? ""),
        ...(typeof body.lossReasonTypeId === "string"
          ? { lossReasonTypeId: body.lossReasonTypeId }
          : {}),
      });
    } else if (action === "change_status") {
      await this.updateService.updateLead(companyId, actor, leadId, {
        status: String(value ?? ""),
      });
    } else if (action === "archive") {
      await this.updateService.updateLead(companyId, actor, leadId, {
        status: CrmLeadStatus.archived,
      });
      await this.prisma.crmLead.update({
        where: { id: leadId },
        data: { isArchived: true, updatedBy: actor.userId },
      });
    }
  }
}
