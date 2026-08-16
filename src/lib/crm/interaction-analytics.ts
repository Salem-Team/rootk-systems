import { eachDayOfInterval, format, isAfter, isBefore, startOfDay } from "date-fns";
import type {
  CrmCallMeetingBucket,
  CrmClientCallRow,
  CrmDayInteractionRow,
  CrmHourInteractionRow,
  CrmInteractionBreakdown,
  CrmInteractionCallDetail,
  CrmLead,
  CrmLeadFeedback,
  CrmMeetingLocation,
  CrmMeetingMode,
} from "@/types/crm";
import { parseMaybe } from "@/lib/crm/date-range";
import { formatHour12Label } from "@/lib/crm/format";
import { canonicalPhoneOrNull } from "@/lib/phone-normalize";

function emptyBucket(): CrmCallMeetingBucket {
  return {
    activeCalls: 0,
    inactiveCalls: 0,
    meetings: 0,
    meetingsOnline: 0,
    meetingsOffline: 0,
    meetingsOurCompany: 0,
    meetingsClientCompany: 0,
  };
}

export function emptyInteractionBreakdown(): CrmInteractionBreakdown {
  return {
    totals: emptyBucket(),
    byDay: [],
    byHour: [],
    byClient: [],
    calls: [],
  };
}

export const INTERACTION_SUMMARY_KINDS = [
  "activeCalls",
  "inactiveCalls",
  "meetings",
  "meetingsSplit",
] as const;

export type CrmInteractionSummaryKind =
  (typeof INTERACTION_SUMMARY_KINDS)[number];

/** Rows for a summary-card popup (clients + their recorded feedback). */
export function filterCallsBySummaryKind(
  calls: CrmInteractionCallDetail[],
  kind: CrmInteractionSummaryKind
): CrmInteractionCallDetail[] {
  if (kind === "activeCalls") {
    return calls.filter((call) => call.callAnswered);
  }
  if (kind === "inactiveCalls") {
    return calls.filter((call) => !call.callAnswered);
  }
  return calls.filter((call) => Boolean(call.meetingMode));
}

export function filterClientDayCalls(
  calls: CrmInteractionCallDetail[],
  row: Pick<CrmClientCallRow, "leadId" | "date" | "ownerEmployeeId">,
  answered: boolean
): CrmInteractionCallDetail[] {
  return calls.filter(
    (call) =>
      call.leadId === row.leadId &&
      call.date === row.date &&
      call.callAnswered === answered &&
      (!row.ownerEmployeeId || call.ownerEmployeeId === row.ownerEmployeeId)
  );
}

export const INTERACTION_BY_CLIENT_PAGE_SIZE = 20;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Match a by-client row on name, company, owner, or phone number. */
export function clientCallRowMatchesSearch(
  row: CrmClientCallRow,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.leadName, row.companyName, row.ownerEmployeeName, row.phone]
    .join(" ")
    .toLowerCase();
  if (hay.includes(q)) return true;
  const qDigits = digitsOnly(query);
  if (qDigits.length < 3) return false;
  const phoneDigits = digitsOnly(row.phoneNormalized || row.phone);
  if (phoneDigits.includes(qDigits)) return true;
  const canonical = canonicalPhoneOrNull(query);
  if (!canonical) return false;
  return (
    row.phoneNormalized === canonical ||
    canonicalPhoneOrNull(row.phone) === canonical
  );
}

export function filterAndPaginateClientCallRows(
  rows: CrmClientCallRow[],
  query: string,
  page: number,
  pageSize = INTERACTION_BY_CLIENT_PAGE_SIZE
): {
  items: CrmClientCallRow[];
  total: number;
  page: number;
  totalPages: number;
} {
  const filtered = query.trim()
    ? rows.filter((row) => clientCallRowMatchesSearch(row, query))
    : rows;
  const size = Math.max(1, pageSize);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return {
    items: filtered.slice(start, start + size),
    total,
    page: safePage,
    totalPages,
  };
}

function inBounds(d: Date, from: Date | null, to: Date): boolean {
  if (from && isBefore(d, from)) return false;
  if (isAfter(d, to)) return false;
  return true;
}

function applyCall(bucket: CrmCallMeetingBucket, answered: boolean) {
  if (answered) bucket.activeCalls += 1;
  else bucket.inactiveCalls += 1;
}

function applyMeeting(
  bucket: CrmCallMeetingBucket,
  mode: CrmMeetingMode | null | undefined,
  location: CrmMeetingLocation | null | undefined
) {
  if (!mode) return;
  bucket.meetings += 1;
  if (mode === "online") bucket.meetingsOnline += 1;
  else {
    bucket.meetingsOffline += 1;
    if (location === "our_company") bucket.meetingsOurCompany += 1;
    if (location === "client_company") bucket.meetingsClientCompany += 1;
  }
}

function mergeBucket(
  target: CrmCallMeetingBucket,
  source: CrmCallMeetingBucket
): CrmCallMeetingBucket {
  return {
    activeCalls: target.activeCalls + source.activeCalls,
    inactiveCalls: target.inactiveCalls + source.inactiveCalls,
    meetings: target.meetings + source.meetings,
    meetingsOnline: target.meetingsOnline + source.meetingsOnline,
    meetingsOffline: target.meetingsOffline + source.meetingsOffline,
    meetingsOurCompany: target.meetingsOurCompany + source.meetingsOurCompany,
    meetingsClientCompany:
      target.meetingsClientCompany + source.meetingsClientCompany,
  };
}

function contactsInBucket(b: CrmCallMeetingBucket): number {
  return b.activeCalls + b.inactiveCalls + b.meetings;
}

/**
 * Build day / hour / per-client call+meeting breakdown from CRM feedback.
 * Signature matches `buildCrmDashboard` usage.
 */
export function buildInteractionBreakdown(
  feedback: CrmLeadFeedback[],
  leads: CrmLead[],
  employees: Array<{ id: string; name: string }>,
  from: Date | null,
  to: Date,
  hourFilter?: number | null
): CrmInteractionBreakdown {
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  const rangeStart = from ?? startOfDay(to);
  const days = eachDayOfInterval({ start: rangeStart, end: to });

  const dayMap = new Map<string, CrmCallMeetingBucket>();
  for (const day of days) {
    dayMap.set(format(day, "yyyy-MM-dd"), emptyBucket());
  }

  const hourMap = new Map<string, CrmCallMeetingBucket>();
  const clientDayMap = new Map<string, CrmCallMeetingBucket>();
  const lifetimeByLead = new Map<string, number>();
  const totals = emptyBucket();
  const calls: CrmInteractionCallDetail[] = [];

  for (const row of feedback) {
    lifetimeByLead.set(
      row.leadId,
      (lifetimeByLead.get(row.leadId) ?? 0) + 1 + (row.meetingMode ? 1 : 0)
    );

    const created = parseMaybe(row.createdAt);
    if (!created) continue;
    if (!inBounds(created, from, to)) continue;
    if (
      hourFilter != null &&
      Number.isFinite(hourFilter) &&
      created.getHours() !== hourFilter
    ) {
      continue;
    }

    const lead = leadById.get(row.leadId);
    const day = format(created, "yyyy-MM-dd");
    const hour = created.getHours();
    const dayBucket = dayMap.get(day) ?? emptyBucket();
    const hourKey = `${day}|${hour}`;
    const hourBucket = hourMap.get(hourKey) ?? emptyBucket();
    const ownerId =
      lead?.ownerEmployeeId ?? row.recordedByEmployeeId ?? "__none__";
    const clientKey = `${row.leadId}|${day}|${ownerId}`;
    const clientBucket = clientDayMap.get(clientKey) ?? emptyBucket();

    applyCall(dayBucket, row.callAnswered !== false);
    applyCall(hourBucket, row.callAnswered !== false);
    applyCall(clientBucket, row.callAnswered !== false);
    applyCall(totals, row.callAnswered !== false);

    if (row.meetingMode) {
      applyMeeting(dayBucket, row.meetingMode, row.meetingLocation);
      applyMeeting(hourBucket, row.meetingMode, row.meetingLocation);
      applyMeeting(clientBucket, row.meetingMode, row.meetingLocation);
      applyMeeting(totals, row.meetingMode, row.meetingLocation);
    }

    dayMap.set(day, dayBucket);
    hourMap.set(hourKey, hourBucket);
    clientDayMap.set(clientKey, clientBucket);

    const recorderId = row.recordedByEmployeeId ?? null;
    calls.push({
      id: row.id,
      leadId: row.leadId,
      leadName: lead?.name ?? row.leadId,
      companyName: lead?.companyName ?? "",
      date: day,
      createdAt:
        typeof row.createdAt === "string"
          ? row.createdAt
          : created.toISOString(),
      callAnswered: row.callAnswered !== false,
      customerFeedback: row.customerFeedback ?? "",
      notes: row.notes ?? "",
      nextAction: row.nextAction ?? "none",
      meetingMode: row.meetingMode ?? null,
      meetingLocation: row.meetingLocation ?? null,
      recordedByEmployeeId: recorderId,
      recordedByEmployeeName: recorderId
        ? (nameById.get(recorderId) ?? recorderId)
        : "",
      ownerEmployeeId: ownerId === "__none__" ? null : ownerId,
      feedbackTypeId: row.feedbackTypeId ?? "",
    });
  }

  const byDay: CrmDayInteractionRow[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, label: date, ...bucket }))
    .filter(
      (row) =>
        row.activeCalls > 0 || row.inactiveCalls > 0 || row.meetings > 0
    );

  const hourTotals = new Map<number, CrmCallMeetingBucket>();
  for (const [key, bucket] of hourMap.entries()) {
    const hour = Number(key.split("|")[1]);
    hourTotals.set(
      hour,
      mergeBucket(hourTotals.get(hour) ?? emptyBucket(), bucket)
    );
  }
  const byHour: CrmHourInteractionRow[] = [...hourTotals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, bucket]) => ({
      hour,
      label: formatHour12Label(hour),
      ...bucket,
    }))
    .filter(
      (row) =>
        row.activeCalls > 0 || row.inactiveCalls > 0 || row.meetings > 0
    );

  const byClient: CrmClientCallRow[] = [...clientDayMap.entries()]
    .map(([key, bucket]) => {
      const [leadId, date, ownerId] = key.split("|");
      const lead = leadById.get(leadId!);
      return {
        leadId: leadId!,
        leadName: lead?.name ?? leadId!,
        companyName: lead?.companyName ?? "",
        phone: lead?.phone ?? "",
        phoneNormalized: lead?.phoneNormalized ?? null,
        ownerEmployeeId: ownerId === "__none__" ? null : (ownerId ?? null),
        ownerEmployeeName:
          !ownerId || ownerId === "__none__"
            ? ""
            : (nameById.get(ownerId) ?? ownerId),
        date: date!,
        contactsThatDay: contactsInBucket(bucket),
        contactsTotal:
          lifetimeByLead.get(leadId!) ?? contactsInBucket(bucket),
        ...bucket,
      };
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.contactsThatDay - a.contactsThatDay ||
        a.leadName.localeCompare(b.leadName)
    );

  calls.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { totals, byDay, byHour, byClient, calls };
}
