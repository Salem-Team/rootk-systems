/** Keep in sync with backend/src/crm/crm-follow-up-meta.ts */
export const FOLLOW_UP_ADVANCE_MS = 15 * 60 * 1000;
export const FOLLOW_UP_DUE_GRACE_MS = 3 * 60 * 1000;
/** How far ahead the phone schedules alarms. Beyond this, the next sync picks them up. */
export const FOLLOW_UP_SCHEDULE_HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

export const FOLLOW_UP_REMINDER_ACTIONS = ["call", "meeting"] as const;

export type FollowUpReminderSlot = "advance" | "due";

export function isRemindableFollowUpAction(action: string): boolean {
  return (FOLLOW_UP_REMINDER_ACTIONS as readonly string[]).includes(action);
}

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

export function reminderFireAt(
  nextFollowUpAt: Date,
  slot: FollowUpReminderSlot
): Date {
  if (slot === "advance") {
    return new Date(nextFollowUpAt.getTime() - FOLLOW_UP_ADVANCE_MS);
  }
  return nextFollowUpAt;
}
