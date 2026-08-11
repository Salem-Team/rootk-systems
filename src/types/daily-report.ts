export type DailyReportFactKind =
  | "leave"
  | "absent"
  | "present"
  | "none"
  | "tasks"
  | "ads"
  | "crm"
  | "meetings";

export interface DailyReportFact {
  kind: DailyReportFactKind;
  count?: number;
  sample?: string;
}

export interface DailyReportRow {
  employeeId: string;
  name: string;
  department: string;
  attendanceStatus: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workingMinutes: number;
  tasksCompleted: number;
  taskTitles: string[];
  tasksOpen: number;
  adsCount: number;
  crmCount: number;
  meetingsCount: number;
  facts: DailyReportFact[];
}

export interface DailyReport {
  date: string;
  rows: DailyReportRow[];
}
