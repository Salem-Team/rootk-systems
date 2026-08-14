/** Day / hour / per-client call & meeting breakdown for CRM analytics. */
import {
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

export type InteractionFeedbackRow = {
  id: string;
  leadId: string;
  feedbackTypeId?: string;
  customerFeedback?: string;
  notes?: string;
  nextAction?: string;
  recordedByEmployeeId?: string | null;
  callAnswered: boolean;
  meetingMode: "online" | "offline" | null;
  meetingLocation: "our_company" | "client_company" | null;
  createdAt: Date;
};

export type InteractionLeadRow = {
  id: string;
  name: string;
  companyName: string;
  ownerEmployeeId: string | null;
};

type CallMeetingBucket = {
  activeCalls: number;
  inactiveCalls: number;
  meetings: number;
  meetingsOnline: number;
  meetingsOffline: number;
  meetingsOurCompany: number;
  meetingsClientCompany: number;
};

type CallDetail = {
  id: string;
  leadId: string;
  leadName: string;
  companyName: string;
  date: string;
  createdAt: string;
  callAnswered: boolean;
  customerFeedback: string;
  notes: string;
  nextAction: string;
  meetingMode: "online" | "offline" | null;
  meetingLocation: "our_company" | "client_company" | null;
  recordedByEmployeeId: string | null;
  recordedByEmployeeName: string;
  ownerEmployeeId: string | null;
  feedbackTypeId: string;
};

function emptyBucket(): CallMeetingBucket {
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

function applyMeeting(
  bucket: CallMeetingBucket,
  mode: "online" | "offline" | null,
  location: "our_company" | "client_company" | null
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

function applyCall(bucket: CallMeetingBucket, answered: boolean) {
  if (answered) bucket.activeCalls += 1;
  else bucket.inactiveCalls += 1;
}

function mergeBucket(
  target: CallMeetingBucket,
  source: CallMeetingBucket
): CallMeetingBucket {
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

function contactsInBucket(b: CallMeetingBucket): number {
  return b.activeCalls + b.inactiveCalls + b.meetings;
}

function inBounds(d: Date, from: Date | null, to: Date): boolean {
  if (from && isBefore(d, from)) return false;
  if (isAfter(d, to)) return false;
  return true;
}

export function emptyInteractionBreakdown() {
  return {
    totals: emptyBucket(),
    byDay: [] as Array<{ date: string; label: string } & CallMeetingBucket>,
    byHour: [] as Array<{ hour: number; label: string } & CallMeetingBucket>,
    byClient: [] as Array<{
      leadId: string;
      leadName: string;
      companyName: string;
      ownerEmployeeId: string | null;
      ownerEmployeeName: string;
      date: string;
      contactsThatDay: number;
      contactsTotal: number;
    } & CallMeetingBucket>,
    calls: [] as CallDetail[],
  };
}

export function buildInteractionBreakdown(
  feedback: InteractionFeedbackRow[],
  leads: InteractionLeadRow[],
  employees: Array<{ id: string; name: string }>,
  from: Date | null,
  to: Date,
  hourFilter?: number | null
) {
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  const rangeStart = from ?? startOfDay(to);
  const days = eachDayOfInterval({ start: rangeStart, end: to });
  const dayMap = new Map<string, CallMeetingBucket>();
  for (const day of days) {
    dayMap.set(format(day, "yyyy-MM-dd"), emptyBucket());
  }

  const hourMap = new Map<string, CallMeetingBucket>();
  const clientDayMap = new Map<string, CallMeetingBucket>();
  const lifetimeByLead = new Map<string, number>();
  const totals = emptyBucket();
  const calls: CallDetail[] = [];

  for (const row of feedback) {
    lifetimeByLead.set(row.leadId, (lifetimeByLead.get(row.leadId) ?? 0) + 1);
    if (!inBounds(row.createdAt, from, to)) continue;
    if (
      hourFilter != null &&
      Number.isFinite(hourFilter) &&
      row.createdAt.getHours() !== hourFilter
    ) {
      continue;
    }

    const lead = leadById.get(row.leadId);
    const day = format(row.createdAt, "yyyy-MM-dd");
    const hour = row.createdAt.getHours();
    const dayBucket = dayMap.get(day) ?? emptyBucket();
    const hourKey = `${day}|${hour}`;
    const hourBucket = hourMap.get(hourKey) ?? emptyBucket();
    const ownerId =
      lead?.ownerEmployeeId ?? row.recordedByEmployeeId ?? "__none__";
    const clientKey = `${row.leadId}|${day}|${ownerId}`;
    const clientBucket = clientDayMap.get(clientKey) ?? emptyBucket();

    applyCall(dayBucket, row.callAnswered);
    applyCall(hourBucket, row.callAnswered);
    applyCall(clientBucket, row.callAnswered);
    applyCall(totals, row.callAnswered);

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
      createdAt: row.createdAt.toISOString(),
      callAnswered: row.callAnswered,
      customerFeedback: row.customerFeedback ?? "",
      notes: row.notes ?? "",
      nextAction: row.nextAction ?? "none",
      meetingMode: row.meetingMode,
      meetingLocation: row.meetingLocation,
      recordedByEmployeeId: recorderId,
      recordedByEmployeeName: recorderId
        ? (nameById.get(recorderId) ?? recorderId)
        : "",
      ownerEmployeeId: ownerId === "__none__" ? null : ownerId,
      feedbackTypeId: row.feedbackTypeId ?? "",
    });
  }

  const byDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, label: date, ...bucket }))
    .filter(
      (row) =>
        row.activeCalls > 0 || row.inactiveCalls > 0 || row.meetings > 0
    );

  const hourTotals = new Map<number, CallMeetingBucket>();
  for (const [key, bucket] of hourMap.entries()) {
    const hour = Number(key.split("|")[1]);
    hourTotals.set(
      hour,
      mergeBucket(hourTotals.get(hour) ?? emptyBucket(), bucket)
    );
  }
  const byHour = [...hourTotals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, bucket]) => ({
      hour,
      label: (() => {
        const h = ((Math.trunc(hour) % 24) + 24) % 24;
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:00 ${period}`;
      })(),
      ...bucket,
    }))
    .filter(
      (row) =>
        row.activeCalls > 0 || row.inactiveCalls > 0 || row.meetings > 0
    );

  const byClient = [...clientDayMap.entries()]
    .map(([key, bucket]) => {
      const [leadId, date, ownerId] = key.split("|");
      const lead = leadById.get(leadId!);
      return {
        leadId: leadId!,
        leadName: lead?.name ?? leadId!,
        companyName: lead?.companyName ?? "",
        ownerEmployeeId: ownerId === "__none__" ? null : (ownerId ?? null),
        ownerEmployeeName:
          !ownerId || ownerId === "__none__"
            ? ""
            : (nameById.get(ownerId) ?? ownerId),
        date: date!,
        contactsThatDay: contactsInBucket(bucket),
        contactsTotal: lifetimeByLead.get(leadId!) ?? contactsInBucket(bucket),
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
