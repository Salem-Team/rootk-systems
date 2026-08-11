import { fetchDailyReport } from "@/api/daily-plan.api";
import { AppRole } from "@/constants/roles";
import { isApiMode } from "@/lib/env";
import {
  buildDailyReportFacts,
  isInDay,
  isValidReportDate,
} from "@/lib/daily-report";
import { ValidationError } from "@/lib/errors";
import { todayKey } from "@/lib/mock-date";
import { directReportIds } from "@/lib/team";
import {
  attendanceRepository,
  crmLeadActivityRepository,
  employeeRepository,
  leaveRepository,
  organicAdvertisementRepository,
  workMeetingRepository,
  workTaskRepository,
} from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import { actorContext } from "@/services/work/work-shared";
import type { ApiResponse, DailyReport, DailyReportRow, Employee } from "@/types";

const emptyReport = (date = ""): DailyReport => ({ date, rows: [] });

function dateKey(value: string | undefined | null): string {
  return (value ?? "").slice(0, 10);
}

function scopedEmployees(roster: Employee[], actor: ReturnType<typeof actorContext>) {
  const active = roster.filter((e) => e.status !== "inactive");
  if (actor.role === AppRole.admin) return active;
  const allowed = new Set(
    [actor.employeeId, ...directReportIds(actor.employeeId, roster)].filter(Boolean)
  );
  return active.filter((e) => allowed.has(e.id));
}

export async function getDailyReport(
  dateRaw?: string
): Promise<ApiResponse<DailyReport>> {
  const date = (dateRaw ?? todayKey()).trim();
  try {
    if (!isValidReportDate(date)) {
      throw new ValidationError("date must be YYYY-MM-DD");
    }
    if (isApiMode()) return fetchDailyReport(date);

    const actor = actorContext();
    const [
      roster,
      attendance,
      tasks,
      ads,
      crm,
      leaves,
      meetings,
    ] = await Promise.all([
      employeeRepository.list(),
      attendanceRepository.list(),
      workTaskRepository.list(),
      organicAdvertisementRepository.list(),
      crmLeadActivityRepository.list(),
      leaveRepository.list(),
      workMeetingRepository.list(),
    ]);

    const employees = scopedEmployees(roster, actor).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const idSet = new Set(employees.map((e) => e.id));

    const attendanceBy = new Map(
      attendance
        .filter((r) => dateKey(r.date) === date && idSet.has(r.employeeId))
        .map((r) => [r.employeeId, r])
    );
    const onLeave = new Set(
      leaves
        .filter(
          (l) =>
            l.status === "approved" &&
            idSet.has(l.employeeId) &&
            dateKey(l.startDate) <= date &&
            dateKey(l.endDate) >= date
        )
        .map((l) => l.employeeId)
    );

    const completedBy = new Map<string, string[]>();
    const openBy = new Map<string, number>();
    for (const task of tasks) {
      for (const id of task.assigneeIds) {
        if (!idSet.has(id)) continue;
        if (task.status === "completed" && isInDay(task.completedAt, date)) {
          const list = completedBy.get(id) ?? [];
          list.push(task.title);
          completedBy.set(id, list);
        } else if (task.status !== "completed") {
          openBy.set(id, (openBy.get(id) ?? 0) + 1);
        }
      }
    }

    const adsBy = new Map<string, number>();
    for (const ad of ads) {
      if (!idSet.has(ad.ownerEmployeeId) || !isInDay(ad.addedAt, date)) continue;
      adsBy.set(ad.ownerEmployeeId, (adsBy.get(ad.ownerEmployeeId) ?? 0) + 1);
    }

    const crmBy = new Map<string, number>();
    for (const activity of crm) {
      const id = activity.actorEmployeeId;
      if (!id || !idSet.has(id) || !isInDay(activity.occurredAt, date)) continue;
      crmBy.set(id, (crmBy.get(id) ?? 0) + 1);
    }

    const meetingsBy = new Map<string, number>();
    for (const meeting of meetings) {
      if (dateKey(meeting.date) !== date) continue;
      for (const id of meeting.participantIds) {
        if (!idSet.has(id)) continue;
        meetingsBy.set(id, (meetingsBy.get(id) ?? 0) + 1);
      }
    }

    const rows: DailyReportRow[] = employees.map((employee) => {
      const att = attendanceBy.get(employee.id);
      const taskTitles = completedBy.get(employee.id) ?? [];
      const attendanceStatus = onLeave.has(employee.id)
        ? "on_leave"
        : att?.status ?? null;
      const adsCount = adsBy.get(employee.id) ?? 0;
      const crmCount = crmBy.get(employee.id) ?? 0;
      const meetingsCount = meetingsBy.get(employee.id) ?? 0;
      return {
        employeeId: employee.id,
        name: employee.name,
        department: employee.department,
        attendanceStatus,
        checkIn: att?.checkIn ?? null,
        checkOut: att?.checkOut ?? null,
        workingMinutes: att?.workingMinutes ?? 0,
        tasksCompleted: taskTitles.length,
        taskTitles,
        tasksOpen: openBy.get(employee.id) ?? 0,
        adsCount,
        crmCount,
        meetingsCount,
        facts: buildDailyReportFacts({
          onLeave: onLeave.has(employee.id),
          attendanceStatus,
          taskTitles,
          adsCount,
          crmCount,
          meetingsCount,
        }),
      };
    });

    return ok({ date, rows });
  } catch (error) {
    return fromError(error, emptyReport(date));
  }
}
