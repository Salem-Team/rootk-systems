import { buildDailyReportFacts, isInDateRange } from "@/lib/daily-report";
import type { DailyReportRow } from "@/types/daily-report";
import type { AttendanceRecord, LeaveRequest } from "@/types";
import type { WorkMeeting, WorkTask } from "@/types/work";

function dateKey(value: string | null | undefined): string {
  return (value ?? "").slice(0, 10);
}

function bump(map: Map<string, number>, id: string, n = 1) {
  map.set(id, (map.get(id) ?? 0) + n);
}

export function assembleEmployeeActivityRows(input: {
  employees: Array<{ id: string; name: string; department: string }>;
  from: string;
  to: string;
  attendance: AttendanceRecord[];
  tasks: WorkTask[];
  ads: Array<{ ownerEmployeeId: string; addedAt: string }>;
  crm: Array<{ actorEmployeeId: string | null; occurredAt: string }>;
  feedback: Array<{
    recordedByEmployeeId: string | null;
    callAnswered: boolean;
    createdAt: string;
  }>;
  leaves: LeaveRequest[];
  meetings: WorkMeeting[];
}): DailyReportRow[] {
  const { from, to } = input;
  const singleDay = from === to;
  const idSet = new Set(input.employees.map((e) => e.id));

  const workingBy = new Map<string, number>();
  const presentBy = new Map<string, number>();
  const lateBy = new Map<string, number>();
  const absentBy = new Map<string, number>();
  const attendanceBy = new Map<string, AttendanceRecord>();
  for (const record of input.attendance) {
    const day = dateKey(record.date);
    if (day < from || day > to || !idSet.has(record.employeeId)) continue;
    workingBy.set(
      record.employeeId,
      (workingBy.get(record.employeeId) ?? 0) + (record.workingMinutes ?? 0)
    );
    if (record.status === "late") bump(lateBy, record.employeeId);
    else if (record.status === "absent") bump(absentBy, record.employeeId);
    else if (
      record.status === "present" ||
      record.status === "wfh" ||
      record.status === "early_leave" ||
      record.status === "half_day"
    ) {
      bump(presentBy, record.employeeId);
    }
    const prev = attendanceBy.get(record.employeeId);
    if (!prev || dateKey(record.date) >= dateKey(prev.date)) {
      attendanceBy.set(record.employeeId, record);
    }
  }

  const onLeave = new Set(
    input.leaves
      .filter(
        (l) =>
          l.status === "approved" &&
          idSet.has(l.employeeId) &&
          dateKey(l.startDate) <= to &&
          dateKey(l.endDate) >= from
      )
      .map((l) => l.employeeId)
  );

  const completedBy = new Map<string, string[]>();
  const openBy = new Map<string, number>();
  for (const task of input.tasks) {
    for (const id of task.assigneeIds) {
      if (!idSet.has(id)) continue;
      if (task.status === "completed" && isInDateRange(task.completedAt, from, to)) {
        const list = completedBy.get(id) ?? [];
        list.push(task.title);
        completedBy.set(id, list);
      } else if (task.status !== "completed") {
        bump(openBy, id);
      }
    }
  }

  const adsBy = new Map<string, number>();
  for (const ad of input.ads) {
    if (!idSet.has(ad.ownerEmployeeId) || !isInDateRange(ad.addedAt, from, to)) {
      continue;
    }
    bump(adsBy, ad.ownerEmployeeId);
  }

  const crmBy = new Map<string, number>();
  for (const activity of input.crm) {
    const id = activity.actorEmployeeId;
    if (!id || !idSet.has(id) || !isInDateRange(activity.occurredAt, from, to)) {
      continue;
    }
    bump(crmBy, id);
  }

  const activeCallsBy = new Map<string, number>();
  const inactiveCallsBy = new Map<string, number>();
  for (const row of input.feedback) {
    const id = row.recordedByEmployeeId;
    if (!id || !idSet.has(id) || !isInDateRange(row.createdAt, from, to)) continue;
    if (row.callAnswered) bump(activeCallsBy, id);
    else bump(inactiveCallsBy, id);
  }

  const meetingsBy = new Map<string, number>();
  for (const meeting of input.meetings) {
    const day = dateKey(meeting.date);
    if (day < from || day > to) continue;
    for (const id of meeting.participantIds) {
      if (!idSet.has(id)) continue;
      bump(meetingsBy, id);
    }
  }

  return input.employees.map((employee) => {
    const att = attendanceBy.get(employee.id);
    const taskTitles = completedBy.get(employee.id) ?? [];
    const attendanceStatus = onLeave.has(employee.id)
      ? "on_leave"
      : singleDay
        ? att?.status ?? null
        : null;
    const adsCount = adsBy.get(employee.id) ?? 0;
    const crmCount = crmBy.get(employee.id) ?? 0;
    const crmActiveCalls = activeCallsBy.get(employee.id) ?? 0;
    const crmInactiveCalls = inactiveCallsBy.get(employee.id) ?? 0;
    const meetingsCount = meetingsBy.get(employee.id) ?? 0;
    return {
      employeeId: employee.id,
      name: employee.name,
      department: employee.department,
      attendanceStatus,
      checkIn: att?.checkIn ?? null,
      checkOut: att?.checkOut ?? null,
      workingMinutes: workingBy.get(employee.id) ?? 0,
      tasksCompleted: taskTitles.length,
      taskTitles,
      tasksOpen: openBy.get(employee.id) ?? 0,
      adsCount,
      crmCount,
      crmActiveCalls,
      crmInactiveCalls,
      meetingsCount,
      presentDays: presentBy.get(employee.id) ?? 0,
      lateDays: lateBy.get(employee.id) ?? 0,
      absentDays: absentBy.get(employee.id) ?? 0,
      facts: buildDailyReportFacts({
        onLeave: onLeave.has(employee.id),
        attendanceStatus,
        taskTitles,
        adsCount,
        crmCount,
        meetingsCount,
        activeCalls: crmActiveCalls,
        inactiveCalls: crmInactiveCalls,
      }),
    };
  });
}
