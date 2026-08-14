import type { Prisma } from "@prisma/client";

export const FOLLOW_UP_REMINDER_META_KEY = "followUpReminderSentFor";

/** Minutes before nextFollowUpAt when the in-app reminder fires. */
export const FOLLOW_UP_REMINDER_LEAD_MINUTES = 15;

export function asLeadMetadata(
  raw: unknown
): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export function clearFollowUpReminderMeta(
  raw: unknown
): Prisma.InputJsonValue {
  const meta = asLeadMetadata(raw);
  delete meta[FOLLOW_UP_REMINDER_META_KEY];
  return meta as Prisma.InputJsonValue;
}

export function markFollowUpReminderSent(
  raw: unknown,
  followUpAt: Date
): Prisma.InputJsonValue {
  const meta = asLeadMetadata(raw);
  meta[FOLLOW_UP_REMINDER_META_KEY] = followUpAt.toISOString();
  return meta as Prisma.InputJsonValue;
}

export function hasFollowUpReminderFor(
  raw: unknown,
  followUpAt: Date
): boolean {
  const meta = asLeadMetadata(raw);
  return meta[FOLLOW_UP_REMINDER_META_KEY] === followUpAt.toISOString();
}
