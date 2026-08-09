export type WorkMode = "office" | "hybrid" | "remote";

export type CalendarDayKind =
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "wfh"
  | "holiday"
  | "empty"
  | "today";

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface WorkdayTimelineEvent {
  id: string;
  type:
    | "arrived"
    | "started"
    | "break_start"
    | "break_end"
    | "meeting"
    | "check_out"
    | "late"
    | "wfh";
  titleKey: string;
  detailKey: string;
  at: string;
}

export interface WeeklyAttendanceSummary {
  hoursWorked: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  overtimeHours: number;
  attendanceRate: number;
}

export interface MonthlyChartPoint {
  label: string;
  present: number;
  late: number;
  absent: number;
  hours: number;
  rate: number;
}

export interface CalendarDay {
  date: string;
  kind: CalendarDayKind;
  inMonth: boolean;
  isToday: boolean;
}

export interface HeatmapDay {
  date: string;
  level: HeatmapLevel;
  kind: CalendarDayKind;
}
