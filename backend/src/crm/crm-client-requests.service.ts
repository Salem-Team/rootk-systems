import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CrmClientRequestKind,
  CrmClientRequestStatus,
  NotificationAudience,
  Prisma,
} from "@prisma/client";
import { auditFields } from "../common/mappers";
import { AppRole } from "../common/roles";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { assertCap, type Actor } from "./crm-access";
import { CrmSharedService } from "./crm-shared.service";

const KINDS = new Set<string>(Object.values(CrmClientRequestKind));

const requestInclude = {
  lead: { select: { id: true, name: true, phone: true, ownerEmployeeId: true } },
  replies: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.CrmClientRequestInclude;

type RequestRow = Prisma.CrmClientRequestGetPayload<{
  include: typeof requestInclude;
}>;

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function canManageRequests(actor: Actor): boolean {
  if (actor.role === AppRole.admin) return true;
  return (actor.permissions ?? []).includes("crm.replyClientRequests");
}

function mapReply(row: RequestRow["replies"][number]) {
  return {
    id: row.id,
    requestId: row.requestId,
    body: row.body,
    authorEmployeeId: row.authorEmployeeId ?? "",
    fromManagement: row.fromManagement,
    ...auditFields(row),
  };
}

function mapRequest(row: RequestRow) {
  return {
    id: row.id,
    leadId: row.leadId,
    leadName: row.lead.name,
    leadPhone: row.lead.phone,
    kind: row.kind,
    status: row.status,
    message: row.message,
    listedPrice: row.listedPrice,
    requestedPrice: row.requestedPrice,
    requestedByEmployeeId: row.requestedByEmployeeId ?? "",
    replies: row.replies.map(mapReply),
    ...auditFields(row),
  };
}

@Injectable()
export class CrmClientRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: CrmSharedService,
    private readonly notifications: NotificationsService
  ) {}

  async list(
    companyId: string,
    actor: Actor,
    query: { leadId?: string; status?: string } = {}
  ) {
    assertCap(actor, "view");
    const leadId = query.leadId?.trim() || "";
    if (leadId) {
      await this.shared.requireLead(companyId, actor, leadId);
    }
    const ownerIds = leadId
      ? null
      : await this.shared.resolveOwnerIds(companyId, actor);
    const status =
      query.status === "open" || query.status === "answered"
        ? query.status
        : undefined;

    const rows = await this.prisma.crmClientRequest.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(leadId ? { leadId } : {}),
        ...(status ? { status } : {}),
        ...(ownerIds
          ? { lead: { ownerEmployeeId: { in: ownerIds } } }
          : {}),
      },
      include: requestInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return rows.map(mapRequest);
  }

  async create(
    companyId: string,
    actor: Actor,
    leadId: string,
    body: Record<string, unknown>
  ) {
    const lead = await this.shared.requireLead(companyId, actor, leadId);
    await this.shared.assertCanEditLead(companyId, actor, lead);

    const kind = String(body.kind ?? "").trim();
    if (!KINDS.has(kind)) {
      throw new BadRequestException("Invalid request kind");
    }
    const message = clip(body.message, 2000);
    if (message.length < 2) {
      throw new BadRequestException("Request details are required");
    }
    const listedPrice =
      kind === CrmClientRequestKind.price_exception
        ? clip(body.listedPrice, 80)
        : "";
    const requestedPrice =
      kind === CrmClientRequestKind.price_exception
        ? clip(body.requestedPrice, 80)
        : "";

    const row = await this.prisma.crmClientRequest.create({
      data: {
        companyId,
        leadId,
        kind: kind as CrmClientRequestKind,
        status: CrmClientRequestStatus.open,
        message,
        listedPrice,
        requestedPrice,
        requestedByEmployeeId: actor.employeeId || null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: requestInclude,
    });

    await this.notifyManagement(companyId, actor, row);
    return mapRequest(row);
  }

  async reply(
    companyId: string,
    actor: Actor,
    requestId: string,
    body: Record<string, unknown>
  ) {
    assertCap(actor, "view");
    const text = clip(body.body, 2000);
    if (text.length < 2) {
      throw new BadRequestException("Reply text is required");
    }

    const current = await this.prisma.crmClientRequest.findFirst({
      where: { id: requestId, companyId, deletedAt: null },
      include: requestInclude,
    });
    if (!current) throw new NotFoundException("Request not found");
    await this.shared.requireLead(companyId, actor, current.leadId);

    const fromManagement = canManageRequests(actor);
    if (!fromManagement) {
      const lead = await this.shared.requireLead(companyId, actor, current.leadId);
      await this.shared.assertCanEditLead(companyId, actor, lead);
    }

    const replyRow = await this.prisma.crmClientRequestReply.create({
      data: {
        companyId,
        requestId,
        body: text,
        authorEmployeeId: actor.employeeId || null,
        fromManagement,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    const row = await this.prisma.crmClientRequest.update({
      where: { id: requestId },
      data: {
        status: fromManagement
          ? CrmClientRequestStatus.answered
          : CrmClientRequestStatus.open,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
      include: requestInclude,
    });

    if (fromManagement) {
      await this.notifyRequester(companyId, actor, row);
    } else {
      await this.notifyManagement(companyId, actor, row);
    }

    return {
      ...mapRequest(row),
      reply: mapReply(replyRow),
    };
  }

  private async notifyManagement(
    companyId: string,
    actor: Actor,
    row: RequestRow
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        companyId,
        role: AppRole.admin,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    const recipientIds = admins
      .map((user) => user.id)
      .filter((id) => id && id !== actor.userId);
    if (recipientIds.length === 0) return;
    await this.notifications.notifyDomain({
      companyId,
      actorId: actor.userId,
      category: "system",
      priority: "high",
      audience: NotificationAudience.admin,
      titleKey: "notifications.crmClientRequestTitle",
      bodyKey: "notifications.crmClientRequestBody",
      vars: { lead: row.lead.name, kind: row.kind },
      href: "/crm?tab=clientRequests",
      entityType: "crm_client_request",
      entityId: row.id,
      recipientIds,
    });
  }

  private async notifyRequester(
    companyId: string,
    actor: Actor,
    row: RequestRow
  ) {
    const employeeId = row.requestedByEmployeeId?.trim();
    if (!employeeId || employeeId === actor.employeeId) return;
    const user = await this.prisma.user.findFirst({
      where: { companyId, employeeId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!user || user.id === actor.userId) return;
    await this.notifications.notifyDomain({
      companyId,
      actorId: actor.userId,
      category: "system",
      priority: "high",
      audience: NotificationAudience.employee,
      titleKey: "notifications.crmClientRequestReplyTitle",
      bodyKey: "notifications.crmClientRequestReplyBody",
      vars: { lead: row.lead.name, kind: row.kind },
      href: `/crm?tab=clientRequests&lead=${row.leadId}`,
      entityType: "crm_client_request",
      entityId: row.id,
      recipientIds: [user.id],
    });
  }
}
