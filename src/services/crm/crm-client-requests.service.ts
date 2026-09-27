import {
  fetchCrmClientRequests,
  postCrmClientRequest,
  postCrmClientRequestReply,
} from "@/api/crm.api";
import { hasPermissionId } from "@/constants/permissions";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { notifyQuietly } from "@/services/notification-core.service";
import {
  crmClientRequestRepository,
  crmLeadRepository,
} from "@/repositories/crm.repository";
import { userRepository } from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import {
  actorEmployeeId,
  assertLeadAccess,
  findReadableCrmLead,
  resolveCrmOwnerIds,
} from "@/services/crm/crm-shared";
import {
  getSessionPermissions,
  getSessionRole,
  getSessionUserId,
} from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type {
  CrmClientRequest,
  CrmClientRequestKind,
  CrmClientRequestReply,
} from "@/types/crm";

const KINDS = new Set<CrmClientRequestKind>([
  "price_exception",
  "technical_proposal",
  "contract",
]);

function canManageRequests(): boolean {
  return hasPermissionId(
    "crm.replyClientRequests",
    getSessionPermissions(),
    getSessionRole()
  );
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

async function notifyAdmins(leadName: string, kind: string, requestId: string) {
  const actorId = getSessionUserId() || "system";
  const users = await userRepository.findAll();
  const recipientIds = users
    .filter((user) => user.role === "admin" && user.isActive !== false)
    .map((user) => user.id)
    .filter((id) => id !== actorId);
  if (recipientIds.length === 0) return;
  await notifyQuietly({
    titleKey: "notifications.crmClientRequestTitle",
    bodyKey: "notifications.crmClientRequestBody",
    vars: { lead: leadName, kind },
    category: "system",
    priority: "high",
    audience: "admin",
    recipientIds,
    href: "/crm?tab=clientRequests",
    entityType: "crm_client_request",
    entityId: requestId,
    actorId,
  });
}

export async function listCrmClientRequests(query?: {
  leadId?: string;
  status?: "open" | "answered";
}): Promise<ApiResponse<CrmClientRequest[]>> {
  if (isApiMode()) return fetchCrmClientRequests(query);
  try {
    const all = (await crmClientRequestRepository.findAll()).filter(
      (row) => !row.deletedAt
    );
    let rows = all;
    if (query?.leadId) {
      const lead = await findReadableCrmLead(query.leadId);
      if (!lead) throw new NotFoundError("Lead not found");
      await assertLeadAccess(lead);
      rows = rows.filter((row) => row.leadId === query.leadId);
    } else {
      const ownerIds = await resolveCrmOwnerIds();
      if (ownerIds) {
        const leads = await crmLeadRepository.findAll();
        const allowed = new Set(
          leads
            .filter(
              (lead) =>
                lead.ownerEmployeeId && ownerIds.includes(lead.ownerEmployeeId)
            )
            .map((lead) => lead.id)
        );
        rows = rows.filter((row) => allowed.has(row.leadId));
      }
    }
    if (query?.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return ok(rows.map((row) => ({ ...row, replies: row.replies ?? [] })));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function createCrmClientRequest(
  leadId: string,
  input: {
    kind: CrmClientRequestKind;
    message: string;
    listedPrice?: string;
    requestedPrice?: string;
  }
): Promise<ApiResponse<CrmClientRequest | null>> {
  if (isApiMode()) return postCrmClientRequest(leadId, input);
  try {
    const lead = await findReadableCrmLead(leadId);
    if (!lead || lead.deletedAt) throw new NotFoundError("Lead not found");
    await assertLeadAccess(lead);
    if (!KINDS.has(input.kind)) {
      throw new ValidationError("Invalid request kind");
    }
    const message = clip(input.message, 2000);
    if (message.length < 2) {
      throw new ValidationError("Request details are required");
    }
    const actorId = getSessionUserId() || "system";
    const row = enrichWithAudit(
      {
        id: createId("crm-req"),
        leadId,
        leadName: lead.name,
        leadPhone: lead.phone,
        kind: input.kind,
        status: "open" as const,
        message,
        listedPrice:
          input.kind === "price_exception" ? clip(input.listedPrice, 80) : "",
        requestedPrice:
          input.kind === "price_exception"
            ? clip(input.requestedPrice, 80)
            : "",
        requestedByEmployeeId: actorEmployeeId() ?? "",
        replies: [] as CrmClientRequestReply[],
      },
      actorId
    );
    await crmClientRequestRepository.create(row);
    await notifyAdmins(lead.name, input.kind, row.id);
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function replyCrmClientRequest(
  requestId: string,
  text: string
): Promise<ApiResponse<CrmClientRequest | null>> {
  if (isApiMode()) return postCrmClientRequestReply(requestId, { body: text });
  try {
    const current = await crmClientRequestRepository.findById(requestId);
    if (!current || current.deletedAt) {
      throw new NotFoundError("Request not found");
    }
    const lead = await findReadableCrmLead(current.leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    await assertLeadAccess(lead);
    const body = clip(text, 2000);
    if (body.length < 2) throw new ValidationError("Reply text is required");
    const fromManagement = canManageRequests();
    const actorId = getSessionUserId() || "system";
    const reply = enrichWithAudit(
      {
        id: createId("crm-req-reply"),
        requestId,
        body,
        authorEmployeeId: actorEmployeeId() ?? "",
        fromManagement,
      },
      actorId
    );
    const next = touchEntity(current, actorId, {
      status: fromManagement ? "answered" : "open",
      replies: [...(current.replies ?? []), reply],
      leadName: lead.name,
      leadPhone: lead.phone,
    });
    await crmClientRequestRepository.update(requestId, next);
    if (fromManagement) {
      const users = await userRepository.findAll();
      const requester = users.find(
        (user) => user.employeeId === current.requestedByEmployeeId
      );
      if (requester && requester.id !== actorId) {
        await notifyQuietly({
          titleKey: "notifications.crmClientRequestReplyTitle",
          bodyKey: "notifications.crmClientRequestReplyBody",
          vars: { lead: lead.name, kind: current.kind },
          category: "system",
          priority: "high",
          audience: "employee",
          recipientIds: [requester.id],
          href: `/crm?tab=clientRequests&lead=${lead.id}`,
          entityType: "crm_client_request",
          entityId: requestId,
          actorId,
        });
      }
    } else {
      await notifyAdmins(lead.name, current.kind, requestId);
    }
    return ok(next);
  } catch (error) {
    return fromError(error, null);
  }
}
