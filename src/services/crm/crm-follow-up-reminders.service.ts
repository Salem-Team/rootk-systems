import { isApiMode } from "@/lib/env";
import { parseMaybe } from "@/lib/crm/date-range";
import {
  dueReminderSlots,
  isRemindableFollowUpAction,
  type FollowUpReminderSlot,
} from "@/lib/crm/follow-up-reminder-window";
import { crmLeadRepository } from "@/repositories/crm.repository";
import { pushNotification } from "@/services/notification.service";
import { useSessionStore } from "@/stores/session-store";
import type { CrmLead } from "@/types/crm";

const SENT_KEY = "rootk.crm.followUpReminderSlots";

type SentMap = Record<string, true>;

function reminderKey(
  leadId: string,
  followUpAt: string,
  slot: FollowUpReminderSlot
): string {
  return `${leadId}:${followUpAt}:${slot}`;
}

function readSent(): SentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SentMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSent(map: SentMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SENT_KEY, JSON.stringify(map));
}

function markSent(leadId: string, followUpAt: string, slot: FollowUpReminderSlot) {
  const map = readSent();
  map[reminderKey(leadId, followUpAt, slot)] = true;
  writeSent(map);
}

function alreadySent(
  leadId: string,
  followUpAt: string,
  slot: FollowUpReminderSlot
): boolean {
  return Boolean(readSent()[reminderKey(leadId, followUpAt, slot)]);
}

/** Drop local reminder markers for a lead so a rescheduled follow-up can notify again. */
export function clearLocalCrmFollowUpReminders(leadId: string) {
  if (typeof window === "undefined") return;
  const map = readSent();
  const prefix = `${leadId}:`;
  let changed = false;
  for (const key of Object.keys(map)) {
    if (key.startsWith(prefix)) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) writeSent(map);
}

const COPY: Record<
  FollowUpReminderSlot,
  { titleKey: string; bodyKey: string; priority: "high" | "urgent" }
> = {
  advance: {
    titleKey: "notifications.crmFollowUpAdvanceTitle",
    bodyKey: "notifications.crmFollowUpAdvanceBody",
    priority: "high",
  },
  due: {
    titleKey: "notifications.crmFollowUpDueTitle",
    bodyKey: "notifications.crmFollowUpDueBody",
    priority: "urgent",
  },
};

function slotsForLead(lead: CrmLead, now: Date): FollowUpReminderSlot[] {
  if (
    lead.status !== "active" ||
    !isRemindableFollowUpAction(lead.nextAction) ||
    !lead.nextFollowUpAt
  ) {
    return [];
  }
  const due = parseMaybe(lead.nextFollowUpAt);
  if (!due) return [];
  return dueReminderSlots(due, now).filter(
    (slot) => !alreadySent(lead.id, lead.nextFollowUpAt!, slot)
  );
}

/**
 * Local-mode tick: notify the current user for owned call/meeting follow-ups
 * (15 minutes early, then again at the scheduled time).
 * API mode relies on the Nest CRM reminder poller instead.
 */
export async function processLocalCrmFollowUpReminders(): Promise<void> {
  if (isApiMode()) return;
  if (typeof window === "undefined") return;

  const session = useSessionStore.getState();
  if (!session.authenticated) return;

  const userId = session.user.id;
  const employeeId = session.user.employeeId?.trim() ?? "";
  if (!userId) return;

  const now = new Date();
  const leads = await crmLeadRepository.findAll();
  const due = leads.filter(
    (lead) =>
      slotsForLead(lead, now).length > 0 &&
      (session.role === "admin" ||
        !employeeId ||
        lead.ownerEmployeeId === employeeId)
  );

  for (const lead of due) {
    if (!lead.nextFollowUpAt) continue;
    for (const slot of slotsForLead(lead, now)) {
      const copy = COPY[slot];
      await pushNotification({
        titleKey: copy.titleKey,
        bodyKey: copy.bodyKey,
        vars: {
          name: lead.name,
          action: lead.nextAction,
          at: lead.nextFollowUpAt,
        },
        category: "schedule",
        priority: copy.priority,
        audience: "employee",
        recipientIds: [userId],
        href: `/crm?lead=${lead.id}`,
        entityType: "crm_lead",
        entityId: lead.id,
        actorId: "system",
      });
      markSent(lead.id, lead.nextFollowUpAt, slot);
    }
  }
}
