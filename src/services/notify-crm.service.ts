import { notifyQuietly } from "@/services/notification-core.service";
import { resolveAccountFullName } from "@/lib/user-display-name";
import { userRepository } from "@/repositories";
import { useSessionStore } from "@/stores/session-store";

function sessionActorName(): string {
  const user = useSessionStore.getState().user;
  return resolveAccountFullName(user) || user.displayName || user.email;
}

async function resolveOwnerRecipientIds(
  ownerEmployeeId: string,
  actorId: string
): Promise<string[]> {
  const directory = await userRepository.findAll();
  const matched = directory.filter(
    (user) =>
      user.isActive !== false &&
      (user.id === ownerEmployeeId || user.employeeId === ownerEmployeeId)
  );
  const ids = matched.map((user) => user.id);
  // Local demo often keys recipients by employee entity id as well.
  if (!ids.includes(ownerEmployeeId)) ids.push(ownerEmployeeId);
  return ids.filter((id) => id && id !== actorId);
}

export async function notifyCrmFeedbackMentions(opts: {
  leadId: string;
  leadName: string;
  feedbackId: string;
  actorId: string;
  recipientIds: string[];
}): Promise<void> {
  const recipients = opts.recipientIds.filter((id) => id && id !== opts.actorId);
  if (recipients.length === 0) return;
  await notifyQuietly({
    titleKey: "notifications.crmFeedbackMentionTitle",
    bodyKey: "notifications.crmFeedbackMentionBody",
    vars: {
      actor: sessionActorName(),
      lead: opts.leadName,
    },
    category: "mention",
    priority: "high",
    audience: "all",
    recipientIds: recipients,
    href: `/crm?lead=${opts.leadId}`,
    entityType: "crm_feedback",
    entityId: opts.feedbackId,
    actorId: opts.actorId,
  });
}

/** Notify sales owner when a lead is assigned to them (local dual-mode). */
export async function notifyCrmLeadAssigned(opts: {
  leadId: string;
  leadName: string;
  phone: string;
  companyName: string;
  stageName?: string;
  ownerEmployeeId: string;
  actorId: string;
  actorEmployeeId?: string | null;
}): Promise<void> {
  const ownerEmployeeId = opts.ownerEmployeeId.trim();
  if (!ownerEmployeeId) return;
  if (
    opts.actorEmployeeId &&
    ownerEmployeeId === opts.actorEmployeeId.trim()
  ) {
    return;
  }

  const recipientIds = await resolveOwnerRecipientIds(
    ownerEmployeeId,
    opts.actorId
  );
  if (recipientIds.length === 0) return;

  await notifyQuietly({
    titleKey: "notifications.crmLeadAssignedTitle",
    bodyKey: "notifications.crmLeadAssignedBody",
    vars: {
      actor: sessionActorName(),
      name: opts.leadName || "—",
      phone: opts.phone.trim() || "—",
      company: opts.companyName.trim() || "—",
      stage: (opts.stageName || "").trim() || "—",
    },
    category: "work",
    priority: "high",
    audience: "employee",
    recipientIds,
    href: `/crm?lead=${opts.leadId}`,
    entityType: "crm_lead",
    entityId: opts.leadId,
    actorId: opts.actorId,
  });
}
