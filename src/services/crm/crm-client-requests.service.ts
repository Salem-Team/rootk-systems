import {
  fetchCrmClientRequests,
  postCrmClientRequest,
  postCrmClientRequestReply,
  putCrmClientRequestProposal,
} from "@/api/crm.api";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import {
  formatDocumentReference,
  parseDocumentReference,
  withClientDocumentNumbers,
} from "@/lib/crm/document-reference";
import { readQuotationPrices } from "@/lib/crm/quotation-prices";
import { templateDraftIssue } from "@/lib/crm/technical-proposal";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import {
  clientRequestInboxHref,
  clientRequestLeadHref,
} from "@/lib/notification-href";
import { notifyQuietly } from "@/services/notification-core.service";
import { resolveAccountFullName } from "@/lib/user-display-name";
import {
  crmClientRequestRepository,
  crmLeadRepository,
} from "@/repositories/crm.repository";
import { notificationRepository, userRepository } from "@/repositories";
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

function withoutReference(
  document: TechnicalProposalDocument
): TechnicalProposalDocument {
  const { reference: _ignored, ...rest } = document;
  return rest;
}

async function persistDocumentNumbers(
  rows: CrmClientRequest[]
): Promise<CrmClientRequest[]> {
  const synced = withClientDocumentNumbers(rows);
  for (let index = 0; index < synced.length; index += 1) {
    const next = synced[index];
    if (
      (next.proposal?.reference ?? "") ===
      (rows[index]?.proposal?.reference ?? "")
    ) {
      continue;
    }
    await crmClientRequestRepository.update(next.id, next);
  }
  return synced;
}

async function hasUnreadNotice(
  recipientIds: string[],
  requestId: string,
  titleKey: string
) {
  const rows = await notificationRepository.findAll();
  return rows.some(
    (item) =>
      !item.deletedAt &&
      item.entityType === "crm_client_request" &&
      item.entityId === requestId &&
      item.titleKey === titleKey &&
      recipientIds.some(
        (id) => item.recipientIds?.includes(id) && !item.readBy.includes(id)
      )
  );
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
  const titleKey = followUp
    ? "notifications.crmClientRequestFollowUpTitle"
    : "notifications.crmClientRequestTitle";
  if (await hasUnreadNotice(recipientIds, requestId, titleKey)) return;
  await notifyQuietly({
    titleKey,
    bodyKey: followUp
      ? "notifications.crmClientRequestFollowUpBody"
      : "notifications.crmClientRequestBody",
    vars: { lead: leadName, kind, actor: actorName },
    category: "work",
    priority: "high",
    audience: "admin",
    recipientIds,
    href: clientRequestInboxHref(requestId),
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
    const all = await persistDocumentNumbers(
      (await crmClientRequestRepository.findAll()).filter((row) => !row.deletedAt)
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
    document?: TechnicalProposalDocument;
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
    const proposal = input.document ? withoutReference(input.document) : null;
    if (proposal && templateDraftIssue(proposal)) {
      throw new ValidationError("Proposal document is incomplete");
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
        proposal,
      },
      actorId
    );
    await crmClientRequestRepository.create(row);
    const synced = await persistDocumentNumbers(
      (await crmClientRequestRepository.findAll()).filter((item) => !item.deletedAt)
    );
    await notifyManager(lead.name, input.kind, row.id, false);
    return ok(synced.find((item) => item.id === row.id) ?? row);
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
    const stored = parseDocumentReference(current.proposal?.reference);
    const next = touchEntity(current, actorId, {
      status: fromManagement ? "answered" : "open",
      replies: [...(current.replies ?? []), reply],
      leadName: lead.name,
      leadPhone: lead.phone,
      ...(fromManagement && document
        ? {
            proposal: stored
              ? { ...document, reference: formatDocumentReference(stored) }
              : withoutReference(document),
          }
        : {}),
    });
    await crmClientRequestRepository.update(requestId, next);
    const synced = document
      ? await persistDocumentNumbers(
          (await crmClientRequestRepository.findAll()).filter(
            (item) => !item.deletedAt
          )
        )
      : null;
    const saved = synced?.find((item) => item.id === requestId) ?? next;
    if (fromManagement) {
      const users = await userRepository.findAll();
      const requester = users.find(
        (user) => user.employeeId === current.requestedByEmployeeId
      );
      if (requester && requester.id !== actorId) {
        const titleKey = "notifications.crmClientRequestReplyTitle";
        if (await hasUnreadNotice([requester.id], requestId, titleKey)) return ok(saved);
        await notifyQuietly({
          titleKey,
          bodyKey: "notifications.crmClientRequestReplyBody",
          vars: { lead: lead.name, kind: current.kind },
          category: "work",
          priority: "high",
          audience: "employee",
          recipientIds: [requester.id],
          href: clientRequestLeadHref(current.leadId, requestId),
          entityType: "crm_client_request",
          entityId: requestId,
          actorId,
        });
      }
    } else {
      await notifyManager(lead.name, current.kind, requestId, true);
    }
    return ok(saved);
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
    const fromManagement = canManageRequests();
    if (templateDraftIssue(document)) {
      throw new ValidationError("Proposal document is incomplete");
    }
    const current = await crmClientRequestRepository.findById(requestId);
    if (!current || current.deletedAt) {
      throw new NotFoundError("Request not found");
    }
    const lead = await findReadableCrmLead(current.leadId);
    if (!lead) throw new NotFoundError("Lead not found");
    if (!fromManagement) {
      if (
        current.kind !== "technical_proposal" &&
        current.kind !== "contract" &&
        current.kind !== "price_exception"
      ) {
        throw new ForbiddenError("Only management can edit this template");
      }
      await assertLeadAccess(lead);
    }
    const actorId = getSessionUserId() || "system";
    const stored = parseDocumentReference(current.proposal?.reference);
    const prices =
      current.kind === "price_exception"
        ? readQuotationPrices(document)
        : null;
    const next = touchEntity(current, actorId, {
      ...(fromManagement ? { status: "answered" as const } : {}),
      proposal: stored
        ? { ...document, reference: formatDocumentReference(stored) }
        : withoutReference(document),
      ...(prices
        ? {
            listedPrice: clip(prices.listed, 80),
            requestedPrice: clip(prices.requested, 80),
          }
        : {}),
      leadName: lead.name,
      leadPhone: lead.phone,
    });
    await crmClientRequestRepository.update(requestId, next);
    const synced = await persistDocumentNumbers(
      (await crmClientRequestRepository.findAll()).filter((item) => !item.deletedAt)
    );
    const saved = synced.find((item) => item.id === requestId) ?? next;
    if (!fromManagement) return ok(saved);
    const users = await userRepository.findAll();
    const requester = users.find(
      (user) => user.employeeId === current.requestedByEmployeeId
    );
    if (requester && requester.id !== actorId) {
      const titleKey = "notifications.crmClientRequestProposalTitle";
      if (!(await hasUnreadNotice([requester.id], requestId, titleKey))) {
        await notifyQuietly({
          titleKey,
          bodyKey: "notifications.crmClientRequestProposalBody",
          vars: { lead: lead.name, kind: current.kind },
          category: "work",
          priority: "high",
          audience: "employee",
          recipientIds: [requester.id],
          href: clientRequestLeadHref(current.leadId, requestId),
          entityType: "crm_client_request",
          entityId: requestId,
          actorId,
        });
      }
    }
    return ok(saved);
  } catch (error) {
    return fromError(error, null);
  }
}
