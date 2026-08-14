import { isApiMode } from "@/lib/env";
import { parseMaybe } from "@/lib/crm/date-range";
import { crmLeadRepository } from "@/repositories/crm.repository";
import { pushNotification } from "@/services/notification.service";
import { useSessionStore } from "@/stores/session-store";
import type { CrmLead } from "@/types/crm";

const REMINDER_LEAD_MS = 15 * 60_000;
const SENT_KEY = "rootk.crm.followUpReminders";

type SentMap = Record<string, string>;

function reminderKey(leadId: string, followUpAt: string): string {
  return `${leadId}:${followUpAt}`;
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

function markSent(leadId: string, followUpAt: string) {
  const map = readSent();
  map[reminderKey(leadId, followUpAt)] = new Date().toISOString();
  writeSent(map);
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

function alreadySent(leadId: string, followUpAt: string): boolean {
  return Boolean(readSent()[reminderKey(leadId, followUpAt)]);
}

function isDueSoon(lead: CrmLead, now: Date): boolean {
  if (lead.status !== "active" || !lead.nextFollowUpAt) return false;
  const due = parseMaybe(lead.nextFollowUpAt);
  if (!due) return false;
  const ms = due.getTime() - now.getTime();
  return ms > 0 && ms <= REMINDER_LEAD_MS;
}

/**
 * Local-mode tick: notify the current user about owned leads due within 15 minutes.
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
      isDueSoon(lead, now) &&
      lead.nextFollowUpAt &&
      !alreadySent(lead.id, lead.nextFollowUpAt) &&
      (session.role === "admin" ||
        !employeeId ||
        lead.ownerEmployeeId === employeeId)
  );

  for (const lead of due) {
    if (!lead.nextFollowUpAt) continue;
    await pushNotification({
      titleKey: "notifications.crmFollowUpSoonTitle",
      bodyKey: "notifications.crmFollowUpSoonBody",
      vars: {
        name: lead.name,
        action: lead.nextAction,
      },
      category: "schedule",
      priority: "high",
      audience: "employee",
      recipientIds: [userId],
      href: "/crm",
      entityType: "crm_lead",
      entityId: lead.id,
      actorId: "system",
    });
    markSent(lead.id, lead.nextFollowUpAt);
  }
}
