import { notifyQuietly } from "@/services/notification-core.service";
import { resolveAccountFullName } from "@/lib/user-display-name";
import { useSessionStore } from "@/stores/session-store";

function sessionActorName(): string {
  const user = useSessionStore.getState().user;
  return resolveAccountFullName(user) || user.displayName || user.email;
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
