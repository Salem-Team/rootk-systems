import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse, DayOfWeek, Holiday, WorkSchedule } from "@/types";

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
export function fetchWorkSchedule(): Promise<ApiResponse<WorkSchedule>> {
  return api.get(API_ROUTES.schedule.root, EMPTY_SCHEDULE);
}

/** PATCH /schedule */
export function patchWorkSchedule(
  patch: Partial<
    Pick<
      WorkSchedule,
      | "workingDays"
      | "weekendDays"
      | "wfhDays"
      | "fromTime"
      | "toTime"
      | "gracePeriodMinutes"
      | "breakMinutes"
    >
  > & {
    workingDays?: DayOfWeek[];
  }
): Promise<ApiResponse<WorkSchedule>> {
  return api.patch(API_ROUTES.schedule.root, patch, EMPTY_SCHEDULE);
}

/** GET /schedule/holidays */
export function fetchHolidays(
  type?: Holiday["type"],
  from?: string
): Promise<ApiResponse<Holiday[]>> {
  return api.getList(
    `${API_ROUTES.schedule.holidays}${toQuery({ type, from })}`
  );
}

const EMPTY_HOLIDAY: Holiday = {
  id: "",
  name: "",
  date: "",
  type: "holiday",
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

/** POST /schedule/holidays */
export function postHoliday(
  holiday: Partial<Holiday> & Pick<Holiday, "name" | "date" | "type">
): Promise<ApiResponse<Holiday>> {
  return api.post(API_ROUTES.schedule.holidays, holiday, EMPTY_HOLIDAY);
}

/** DELETE /schedule/holidays/:id */
export function deleteHoliday(id: string): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.schedule.holidayById(id), false);
}
