import type { Prisma } from "@prisma/client";

/** Legacy single-shot marker. Treated as the "due" slot for that timestamp. */
export const FOLLOW_UP_REMINDER_META_KEY = "followUpReminderSentFor";
export const FOLLOW_UP_REMINDER_SLOTS_KEY = "followUpReminderSlots";

/** Fire the early reminder this long before the follow-up. */
export const FOLLOW_UP_ADVANCE_MS = 15 * 60 * 1000;
/**
 * If the 60s poller misses the exact minute, still send the "now" reminder.
 * Kept short so a late tick does not pretend the meeting is starting hours later.
 */
export const FOLLOW_UP_DUE_GRACE_MS = 3 * 60 * 1000;

export const FOLLOW_UP_REMINDER_ACTIONS = ["call", "meeting"] as const;

export type FollowUpReminderSlot = "advance" | "due";

export function isRemindableFollowUpAction(action: string): boolean {
  return (FOLLOW_UP_REMINDER_ACTIONS as readonly string[]).includes(action);
}

/** Which one-shot reminders are due right now. Advance and due never overlap. */
export function dueReminderSlots(
  nextFollowUpAt: Date,
  now: Date
): FollowUpReminderSlot[] {
  const due = nextFollowUpAt.getTime();
  const clock = now.getTime();
  const slots: FollowUpReminderSlot[] = [];
  if (clock >= due - FOLLOW_UP_ADVANCE_MS && clock < due) slots.push("advance");
  if (clock >= due && clock - due <= FOLLOW_UP_DUE_GRACE_MS) slots.push("due");
  return slots;
}

export function asLeadMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export function clearFollowUpReminderMeta(raw: unknown): Prisma.InputJsonValue {
  const meta = asLeadMetadata(raw);
  delete meta[FOLLOW_UP_REMINDER_META_KEY];
  delete meta[FOLLOW_UP_REMINDER_SLOTS_KEY];
  return meta as Prisma.InputJsonValue;
}

function slotsFor(
  raw: unknown
): Record<string, Partial<Record<FollowUpReminderSlot, true>>> {
  const meta = asLeadMetadata(raw);
  const slots = meta[FOLLOW_UP_REMINDER_SLOTS_KEY];
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return {};
  return slots as Record<string, Partial<Record<FollowUpReminderSlot, true>>>;
}

export function hasFollowUpReminderSlot(
  raw: unknown,
  followUpAt: Date,
  slot: FollowUpReminderSlot
): boolean {
  const iso = followUpAt.toISOString();
  if (slot === "due" && asLeadMetadata(raw)[FOLLOW_UP_REMINDER_META_KEY] === iso) {
    return true;
  }
  return slotsFor(raw)[iso]?.[slot] === true;
}

export function markFollowUpReminderSlot(
  raw: unknown,
  followUpAt: Date,
  slot: FollowUpReminderSlot
): Prisma.InputJsonValue {
  const meta = asLeadMetadata(raw);
  const iso = followUpAt.toISOString();
  const current = slotsFor(raw)[iso] ?? {};
  meta[FOLLOW_UP_REMINDER_SLOTS_KEY] = {
    [iso]: { ...current, [slot]: true },
  };
  return meta as Prisma.InputJsonValue;
}
