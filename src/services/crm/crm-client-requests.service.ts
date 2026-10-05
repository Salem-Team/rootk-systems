import {
  fetchCrmClientRequests,
  postCrmClientRequest,
  postCrmClientRequestReply,
  putCrmClientRequestProposal,
} from "@/api/crm.api";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { notifyQuietly } from "@/services/notification-core.service";
import { resolveAccountFullName } from "@/lib/user-display-name";
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
  getSessionUserId,
  useSessionStore,
} from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type {
  CrmClientRequest,
  CrmClientRequestKind,
  CrmClientRequestReply,
  TechnicalProposalDocument,
} from "@/types/crm";

const KINDS = new Set<CrmClientRequestKind>([
  "price_exception",
  "technical_proposal",
  "contract",
]);

function canManageRequests(): boolean {
  const user = useSessionStore.getState().user;
  return isProtectedAdminAccount({
    userId: user.id,
    employeeId: user.employeeId,
    email: user.email,
  });
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

async function notifyManager(
  leadName: string,
  kind: string,
  requestId: string,
  followUp: boolean
) {
  const actorId = getSessionUserId() || "system";
  const actorName =
    resolveAccountFullName(useSessionStore.getState().user) || "—";
  const users = await userRepository.findAll();
  const recipientIds = users
    .filter(
      (user) =>
        user.isActive !== false &&
        user.id !== actorId &&
        isProtectedAdminAccount({
          userId: user.id,
          employeeId: user.employeeId,
          email: user.email,
        })
    )
    .map((user) => user.id);
  if (recipientIds.length === 0) return;
  await notifyQuietly({
    titleKey: followUp
      ? "notifications.crmClientRequestFollowUpTitle"
      : "notifications.crmClientRequestTitle",
    bodyKey: followUp
      ? "notifications.crmClientRequestFollowUpBody"
      : "notifications.crmClientRequestBody",
    vars: { lead: leadName, kind, actor: actorName },
    category: "work",
    priority: "high",
    audience: "admin",
    recipientIds,
    href: "/client-requests",
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
    } else if (!canManageRequests()) {
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
        proposal: null,
      },
      actorId
    );
    await crmClientRequestRepository.create(row);
    await notifyManager(lead.name, input.kind, row.id, false);
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function replyCrmClientRequest(
  requestId: string,
  text: string,
  document?: TechnicalProposalDocument
): Promise<ApiResponse<CrmClientRequest | null>> {
  if (isApiMode()) {
    return postCrmClientRequestReply(requestId, {
      body: text,
      ...(document ? { document } : {}),
    });
  }
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
      ...(fromManagement && document ? { proposal: document } : {}),
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
          category: "work",
          priority: "high",
          audience: "employee",
          recipientIds: [requester.id],
          href: `/crm?lead=${current.leadId}&sheet=requests`,
          entityType: "crm_client_request",
          entityId: requestId,
          actorId,
        });
      }
    } else {
      await notifyManager(lead.name, current.kind, requestId, true);
    }
    return ok(next);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function saveCrmTechnicalProposal(
  requestId: string,
  document: TechnicalProposalDocument
): Promise<ApiResponse<CrmClientRequest | null>> {
  if (isApiMode()) return putCrmClientRequestProposal(requestId, document);
  try {
    if (!canManageRequests()) {
      throw new ValidationError("Only management can edit the proposal");
    }
    const current = await crmClientRequestRepository.findById(requestId);
    if (!current || current.deletedAt) {
      throw new NotFoundError("Request not found");
    }
    const lead = await findReadableCrmLead(current.leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    const actorId = getSessionUserId() || "system";
    const next = touchEntity(current, actorId, {
      status: "answered",
      proposal: document,
      leadName: lead.name,
      leadPhone: lead.phone,
    });
    await crmClientRequestRepository.update(requestId, next);
    const users = await userRepository.findAll();
    const requester = users.find(
      (user) => user.employeeId === current.requestedByEmployeeId
    );
    if (requester && requester.id !== actorId) {
      await notifyQuietly({
        titleKey: "notifications.crmClientRequestProposalTitle",
        bodyKey: "notifications.crmClientRequestProposalBody",
        vars: { lead: lead.name, kind: current.kind },
        category: "work",
        priority: "high",
        audience: "employee",
        recipientIds: [requester.id],
        href: `/crm?lead=${current.leadId}&sheet=requests`,
        entityType: "crm_client_request",
        entityId: requestId,
        actorId,
      });
    }
    return ok(next);
  } catch (error) {
    return fromError(error, null);
  }
}
