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

export const DEFAULT_FILTERS: ReportFilterValues = {
  department: "all",
  status: "all",
  employee: "all",
  location: "all",
  shift: "all",
  workMode: "all",
  leaveType: "all",
};
