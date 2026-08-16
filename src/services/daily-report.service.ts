import { fetchDailyReport } from "@/api/daily-plan.api";
import { canViewOthersInModule } from "@/constants/permissions";
import { isApiMode } from "@/lib/env";
import { isValidReportDate } from "@/lib/daily-report";
import { assembleEmployeeActivityRows } from "@/lib/employee-activity";
import { ValidationError } from "@/lib/errors";
import { todayKey } from "@/lib/mock-date";
import { directReportIds } from "@/lib/team";
import {
  attendanceRepository,
  crmLeadActivityRepository,
  crmLeadFeedbackRepository,
  employeeRepository,
  leaveRepository,
  organicAdvertisementRepository,
  workMeetingRepository,
  workTaskRepository,
} from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import { actorContext } from "@/services/work/work-shared";
import { getSessionPermissions } from "@/stores/session-store";
import type { ApiResponse, DailyReport, Employee } from "@/types";

const emptyReport = (date = ""): DailyReport => ({
  date,
  from: date,
  to: date,
  rows: [],
});

function scopedEmployees(
  roster: Employee[],
  actor: ReturnType<typeof actorContext>
) {
  const active = roster.filter((e) => e.status !== "inactive");
  const others = canViewOthersInModule(
    getSessionPermissions(),
    "dailyPlan.viewAll",
    "dailyPlan.viewTeam",
    actor.role
  );
  if (others.all) return active;
  if (others.team) {
    const allowed = new Set(
      [actor.employeeId, ...directReportIds(actor.employeeId, roster)].filter(
        Boolean
      )
    );
    return active.filter((e) => allowed.has(e.id));
  }
  return active.filter((e) => e.id === actor.employeeId);
}

export async function getEmployeeActivityReport(opts?: {
  date?: string;
  from?: string;
  to?: string;
}): Promise<ApiResponse<DailyReport>> {
  const date = (opts?.date ?? todayKey()).trim();
  const from = (opts?.from ?? date).trim();
  const to = (opts?.to ?? date).trim();
  try {
    if (!isValidReportDate(from) || !isValidReportDate(to) || from > to) {
      throw new ValidationError("date range must be YYYY-MM-DD");
    }
    if (isApiMode()) {
      return fetchDailyReport(from === to ? from : undefined, { from, to });
    }

    const actor = actorContext();
    const [
      roster,
      attendance,
      tasks,
      ads,
      crm,
      feedback,
      leaves,
      meetings,
    ] = await Promise.all([
      employeeRepository.list(),
      attendanceRepository.list(),
      workTaskRepository.list(),
      organicAdvertisementRepository.list(),
      crmLeadActivityRepository.list(),
      crmLeadFeedbackRepository.list(),
      leaveRepository.list(),
      workMeetingRepository.list(),
    ]);

    const employees = scopedEmployees(roster, actor).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const rows = assembleEmployeeActivityRows({
      employees,
      from,
      to,
      attendance,
      tasks,
      ads,
      crm,
      feedback,
      leaves,
      meetings,
    });

    return ok({ date: from === to ? from : `${from}…${to}`, from, to, rows });
  } catch (error) {
    return fromError(error, emptyReport(from));
  }
}

export async function getDailyReport(
  dateRaw?: string
): Promise<ApiResponse<DailyReport>> {
  const date = (dateRaw ?? todayKey()).trim();
  return getEmployeeActivityReport({ date, from: date, to: date });
}
