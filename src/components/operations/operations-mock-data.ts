import type { TranslationPath } from "@/i18n";
import type { AttendanceRecord, Employee, LeaveRequest } from "@/types";

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "high" | "medium" | "low";

export interface OpsTaskSubItem {
  id: string;
  labelKey: TranslationPath;
  done: boolean;
}

export interface OpsTaskUpdate {
  at: string;
  bodyKey: TranslationPath;
}

export interface OpsTask {
  id: string;
  titleKey: TranslationPath;
  descriptionKey: TranslationPath;
  status: TaskStatus;
  priority: TaskPriority;
  due: "today" | "overdue" | "upcoming";
  tagKey: TranslationPath;
  estimateMin: number;
  owner: string;
  relatedMeetingId?: string;
  subItems: OpsTaskSubItem[];
  updates: OpsTaskUpdate[];
}

export interface OpsMeeting {
  id: string;
  titleKey: TranslationPath;
  time: string;
  end: string;
  locationKey: TranslationPath;
  participants: string[];
  when: "today" | "upcoming";
  organizer: string;
  dateLabelKey: TranslationPath;
  agendaKeys: TranslationPath[];
  notesKey: TranslationPath;
  joinHintKey: TranslationPath;
}

export interface OpsNotification {
  id: string;
  category:
    | "unread"
    | "mention"
    | "approval"
    | "attendance"
    | "leave"
    | "announcement"
    | "document";
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
  at: string;
  unread: boolean;
}

export interface OpsActivity {
  id: string;
  kind: "attendance" | "leave" | "request" | "announcement" | "document" | "training";
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
  at: string;
}

export interface OpsChecklistItem {
  id: string;
  labelKey: TranslationPath;
  done: boolean;
}

export interface OpsGoal {
  id: string;
  labelKey: TranslationPath;
  progress: number;
}

export interface OpsDocument {
  id: string;
  titleKey: TranslationPath;
  at: string;
}

export interface OpsAlert {
  id: string;
  severity: "info" | "warn" | "critical";
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
}

export function buildOpsTasks(): OpsTask[] {
  return [];
}

export function buildOpsMeetings(): OpsMeeting[] {
  return [];
}

export function buildOpsNotifications(): OpsNotification[] {
  return [];
}

export function buildOpsActivities(): OpsActivity[] {
  return [];
}

export function buildOpsChecklist(): OpsChecklistItem[] {
  return [];
}

export function buildOpsGoals(): OpsGoal[] {
  return [];
}

export function buildOpsDocuments(): OpsDocument[] {
  return [];
}

export function buildOpsAlerts(): OpsAlert[] {
  return [];
}


export function deriveManagerOps(
  employees: Employee[],
  attendance: AttendanceRecord[],
  leaves: LeaveRequest[]
) {
  const late = attendance.filter((a) => a.isLate || a.status === "late").slice(0, 6);
  const absent = attendance.filter((a) => a.status === "absent").slice(0, 6);
  const onLeave = attendance.filter((a) => a.status === "on_leave").slice(0, 6);
  const pending = leaves.filter((l) => l.status === "pending").slice(0, 6);
  const map = new Map(employees.map((e) => [e.id, e]));
  return {
    late: late.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
      minutes: r.lateMinutes,
    })),
    absent: absent.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
    })),
    onLeave: onLeave.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
    })),
    pending: pending.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
      type: r.type,
      days: r.days,
    })),
  };
}

export function deriveHrOps(employees: Employee[], leaves: LeaveRequest[]) {
  const pendingLeave = leaves.filter((l) => l.status === "pending").length;
  const newHires = [...employees]
    .sort((a, b) => b.joinDate.localeCompare(a.joinDate))
    .slice(0, 4);
  return {
    pendingLeave,
    pendingCorrections: 0,
    probationReviews: 0,
    newHires,
  };
}
