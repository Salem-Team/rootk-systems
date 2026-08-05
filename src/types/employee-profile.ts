export type WorkMode = "office" | "hybrid" | "remote";
export type EmploymentType = "full_time" | "part_time" | "contract";

export interface EmployeeAttendanceSummary {
  presentDays: number;
  lateDays: number;
  absentDays: number;
  workingHours: number;
  averageArrival: string;
  attendanceRate: number;
}

export interface EmployeeLeaveSummary {
  remaining: number;
  approved: number;
  pending: number;
  recent: {
    id: string;
    typeKey: string;
    startDate: string;
    endDate: string;
    days: number;
    status: "approved" | "pending" | "rejected";
  }[];
}

export interface EmployeeActivityItem {
  id: string;
  type:
    | "check_in"
    | "check_out"
    | "leave_request"
    | "profile_updated"
    | "announcement"
    | "training";
  titleKey: string;
  detailKey: string;
  at: string;
}

/** Nest: GET /employees/:id/profile-extras */
export interface EmployeeProfileExtras {
  employmentType: EmploymentType;
  workMode: WorkMode;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  performance: {
    score: number;
    labelKey: string;
    period: string;
  };
  attendance: EmployeeAttendanceSummary;
  leave: EmployeeLeaveSummary;
  activity: EmployeeActivityItem[];
}
