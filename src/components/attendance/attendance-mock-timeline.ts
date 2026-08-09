import { parseISO } from "date-fns";
import type { AttendanceRecord } from "@/types";
import { MOCK_TZ_OFFSET } from "@/lib/mock-date";
import type { WorkdayTimelineEvent, WorkMode } from "./attendance-mock-types";

export function resolveWorkMode(record: AttendanceRecord | null): WorkMode {
  if (!record?.checkIn) return "office";
  if (record.status === "wfh") return "remote";
  return "office";
}

export function expectedCheckOutIso(
  dateKey?: string,
  toTime = "18:00"
): string | null {
  if (!dateKey) return null;
  const time = toTime.length === 5 ? `${toTime}:00` : toTime;
  return `${dateKey}T${time}${MOCK_TZ_OFFSET}`;
}

export function buildWorkdayTimeline(
  record: AttendanceRecord | null
): WorkdayTimelineEvent[] {
  if (!record?.checkIn) return [];

  const checkIn = parseISO(record.checkIn);
  const events: WorkdayTimelineEvent[] = [
    {
      id: "arrived",
      type: record.status === "wfh" ? "wfh" : "arrived",
      titleKey:
        record.status === "wfh"
          ? "attendance.tlWfh"
          : "attendance.tlArrived",
      detailKey:
        record.status === "wfh"
          ? "attendance.tlWfhDetail"
          : "attendance.tlArrivedDetail",
      at: record.checkIn,
    },
  ];

  if (record.isLate) {
    events.push({
      id: "late",
      type: "late",
      titleKey: "attendance.tlLate",
      detailKey: "attendance.tlLateDetail",
      at: record.checkIn,
    });
  }

  events.push({
    id: "started",
    type: "started",
    titleKey: "attendance.tlStarted",
    detailKey: "attendance.tlStartedDetail",
    at: new Date(checkIn.getTime() + 8 * 60_000).toISOString(),
  });

  const breakStart = new Date(checkIn.getTime() + 3.5 * 60 * 60_000);
  const breakEnd = new Date(breakStart.getTime() + 45 * 60_000);
  const meeting = new Date(checkIn.getTime() + 5.25 * 60 * 60_000);

  if (!record.checkOut || breakStart < parseISO(record.checkOut)) {
    events.push({
      id: "break-start",
      type: "break_start",
      titleKey: "attendance.tlBreakStart",
      detailKey: "attendance.tlBreakStartDetail",
      at: breakStart.toISOString(),
    });
    events.push({
      id: "break-end",
      type: "break_end",
      titleKey: "attendance.tlBreakEnd",
      detailKey: "attendance.tlBreakEndDetail",
      at: breakEnd.toISOString(),
    });
  }

  if (!record.checkOut || meeting < parseISO(record.checkOut)) {
    events.push({
      id: "meeting",
      type: "meeting",
      titleKey: "attendance.tlMeeting",
      detailKey: "attendance.tlMeetingDetail",
      at: meeting.toISOString(),
    });
  }

  if (record.checkOut) {
    events.push({
      id: "check-out",
      type: "check_out",
      titleKey: record.isEarlyLeave
        ? "attendance.earlyLeave"
        : "attendance.tlCheckOut",
      detailKey: record.isEarlyLeave
        ? "attendance.tlEarlyDetail"
        : "attendance.tlCheckOutDetail",
      at: record.checkOut,
    });
  }

  return events.sort(
    (a, b) => parseISO(a.at).getTime() - parseISO(b.at).getTime()
  );
}
