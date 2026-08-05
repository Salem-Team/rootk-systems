import {
  deleteHoliday,
  fetchHolidays,
  fetchWorkSchedule,
  patchWorkSchedule,
  postHoliday,
} from "@/api/schedule.api";
import { isApiMode, isLocalMode } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { demoTodayKey } from "@/lib/mock-date";
import { isEmployeeWfhAllowed } from "@/lib/wfh-policy";
import { employeeRepository, scheduleRepository } from "@/repositories";
import { createHolidaySchema, updateWorkScheduleSchema } from "@/schemas";
import { fromError, ok } from "@/services/api-result";
import type { ApiResponse, DayOfWeek, Department, Holiday, WorkSchedule } from "@/types";

const EMPTY_SCHEDULE: WorkSchedule = {
  id: "",
  workingDays: [],
  weekendDays: [],
  wfhDays: [],
  fromTime: "",
  toTime: "",
  gracePeriodMinutes: 0,
  breakMinutes: 0,
  holidays: [],
  companyId: "",
  createdAt: "",
  updatedAt: "",
  createdBy: "",
  updatedBy: "",
  deletedAt: null,
  isArchived: false,
  version: 0,
  metadata: {},
};

/** GET /schedule */
export async function getWorkSchedule(): Promise<ApiResponse<WorkSchedule>> {
  if (isApiMode()) return fetchWorkSchedule();
  try {
    return ok(await scheduleRepository.get());
  } catch (error) {
    return fromError(error, EMPTY_SCHEDULE);
  }
}

/** GET /schedule/holidays */
export async function getHolidays(
  type?: Holiday["type"]
): Promise<ApiResponse<Holiday[]>> {
  if (isApiMode()) return fetchHolidays(type);
  try {
    return ok(await scheduleRepository.listHolidays(type));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /schedule/holidays?from= */
export async function getUpcomingHolidays(
  fromDate = "2026-08-02"
): Promise<ApiResponse<Holiday[]>> {
  if (isApiMode()) return fetchHolidays(undefined, fromDate);
  try {
    const holidays = await scheduleRepository.listHolidays();
    return ok(holidays.filter((h) => h.date >= fromDate));
  } catch (error) {
    return fromError(error, []);
  }
}

/** PATCH /schedule */
export async function updateWorkSchedule(
  patch: Partial<
    Omit<WorkSchedule, "holidays"> & {
      workingDays?: DayOfWeek[];
      weekendDays?: DayOfWeek[];
      wfhDays?: DayOfWeek[];
    }
  >
): Promise<ApiResponse<WorkSchedule>> {
  if (isApiMode()) return patchWorkSchedule(patch);
  try {
    const parsed = updateWorkScheduleSchema.safeParse(patch);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid schedule payload",
        parsed.error.flatten()
      );
    }
    const updated = await scheduleRepository.update(parsed.data);
    return ok(updated, "Work schedule updated");
  } catch (error) {
    return fromError(
      error,
      await scheduleRepository.get().catch(() => EMPTY_SCHEDULE)
    );
  }
}

/** POST /schedule/holidays */
export async function addHoliday(
  holiday: Holiday | Omit<Holiday, keyof import("@/types").BaseEntity>
): Promise<ApiResponse<Holiday>> {
  if (isApiMode()) {
    return postHoliday({
      name: (holiday as Holiday).name,
      date: (holiday as Holiday).date,
      type: (holiday as Holiday).type,
      description: (holiday as Holiday).description,
      id: (holiday as Holiday).id,
    });
  }
  try {
    const parsed = createHolidaySchema.safeParse(holiday);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid holiday payload",
        parsed.error.flatten()
      );
    }
    const created = await scheduleRepository.addHoliday(parsed.data);
    return ok(created, "Holiday added");
  } catch (error) {
    return fromError(error, holiday as Holiday);
  }
}

/** DELETE /schedule/holidays/:id */
export async function removeHoliday(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return deleteHoliday(id);
  try {
    const removed = await scheduleRepository.removeHoliday(id);
    return ok(removed, removed ? "Holiday removed" : "Holiday not found");
  } catch (error) {
    return fromError(error, false);
  }
}

/** Whether the employee may see / use WFH check-in today (admin policy). */
export async function getWfhEligibility(
  employeeId: string,
  dateKey = demoTodayKey()
): Promise<ApiResponse<{ allowed: boolean }>> {
  try {
    const scheduleRes = await getWorkSchedule();
    if (!scheduleRes.success) {
      return ok({ allowed: false });
    }
    let department: Department | undefined;
    if (isLocalMode()) {
      const emp = await employeeRepository.findById(employeeId);
      department = emp?.department;
    } else {
      const { getEmployeeById } = await import("@/services/employees.service");
      const empRes = await getEmployeeById(employeeId);
      department = empRes.data?.department;
    }
    if (!department) return ok({ allowed: false });
    return ok({
      allowed: isEmployeeWfhAllowed(scheduleRes.data, department, dateKey),
    });
  } catch (error) {
    return fromError(error, { allowed: false });
  }
}
