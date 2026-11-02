import { subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { AttendanceStatus, Department } from "@/types";

export interface ReportFilterValues {
  department: Department | "all";
  status: AttendanceStatus | "all";
  employee: string | "all";
  location: string | "all";
  shift: string | "all";
  workMode: string | "all";
  leaveType: string | "all";
  range?: DateRange;
}

export function createDefaultReportRange(days = 30): DateRange {
  const to = new Date();
  const from = subDays(to, days - 1);
  return { from, to };
}

export const DEFAULT_FILTERS: ReportFilterValues = {
  department: "all",
  status: "all",
  employee: "all",
  location: "all",
  shift: "all",
  workMode: "all",
  leaveType: "all",
  range: undefined,
};

/** Fresh defaults (new Date each call) so reset keeps a live 30-day window. */
export function createDefaultReportFilters(): ReportFilterValues {
  return {
    ...DEFAULT_FILTERS,
    range: createDefaultReportRange(30),
  };
}
