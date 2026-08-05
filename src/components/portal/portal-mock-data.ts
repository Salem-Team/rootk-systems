import type { TranslationPath } from "@/i18n";

export type PortalSection =
  | "overview"
  | "profile"
  | "attendance"
  | "leave"
  | "requests"
  | "documents"
  | "notifications"
  | "team"
  | "manager"
  | "timeline"
  | "events"
  | "achievements"
  | "stats";

export interface PortalDocument {
  id: string;
  titleKey: TranslationPath;
  categoryKey: TranslationPath;
  updated: string;
  size: string;
}

export interface PortalRequest {
  id: string;
  kind: "leave" | "wfh" | "correction" | "overtime";
  titleKey: TranslationPath;
  status: "pending" | "approved" | "rejected";
  submitted: string;
  detail: string;
}

export interface PortalTimelineItem {
  id: string;
  category: "attendance" | "leave" | "announcement" | "document" | "training";
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
  at: string;
}

export interface PortalAchievement {
  id: string;
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
  earned: string;
}

export interface PortalEvent {
  id: string;
  titleKey: TranslationPath;
  date: string;
  placeKey: TranslationPath;
}

export interface PortalNotification {
  id: string;
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
  at: string;
  unread: boolean;
}

export function buildPortalDocuments(): PortalDocument[] {
  return [];
}

export function buildPortalRequests(): PortalRequest[] {
  return [];
}

export function buildPortalTimeline(): PortalTimelineItem[] {
  return [];
}

export function buildPortalAchievements(): PortalAchievement[] {
  return [];
}

export function buildPortalEvents(): PortalEvent[] {
  return [];
}

export function buildPortalNotifications(): PortalNotification[] {
  return [];
}

export function buildAttendanceMonthCells(...args: unknown[]) {
  void args;
  return [] as Array<{ day: number; level: 0 | 1 | 2 | 3 | 4 }>;
}

export interface LeaveWorkflowMock {
  balance: { annual: number; used: number; pending: number; sick: number };
  teamAvailability: { name: string; status: "available" | "leave" | "wfh"; dept: string }[];
  conflicts: { id: string; label: string; severity: "low" | "med" | "high" }[];
  coverage: { day: string; onLeave: number; capacity: number }[];
  recentApprovals: {
    id: string;
    name: string;
    type: string;
    result: "approved" | "rejected";
    at: string;
  }[];
  deptCalendar: { day: number; count: number }[];
}

export function buildLeaveWorkflowMock(): LeaveWorkflowMock {
  return {
    balance: { annual: 0, used: 0, pending: 0, sick: 0 },
    teamAvailability: [],
    conflicts: [],
    coverage: [],
    recentApprovals: [],
    deptCalendar: [],
  };
}

