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
  return [
    {
      id: "d1",
      titleKey: "portal.docContract",
      categoryKey: "portal.catEmployment",
      updated: "2026-01-12",
      size: "240 KB",
    },
    {
      id: "d2",
      titleKey: "portal.docPolicies",
      categoryKey: "portal.catPolicies",
      updated: "2026-03-01",
      size: "1.1 MB",
    },
    {
      id: "d3",
      titleKey: "portal.docPayslip",
      categoryKey: "portal.catPayslips",
      updated: "2026-07-28",
      size: "86 KB",
    },
    {
      id: "d4",
      titleKey: "portal.docCertificate",
      categoryKey: "portal.catCertificates",
      updated: "2026-05-18",
      size: "320 KB",
    },
    {
      id: "d5",
      titleKey: "portal.docTraining",
      categoryKey: "portal.catTraining",
      updated: "2026-06-22",
      size: "540 KB",
    },
  ];
}

export function buildPortalRequests(): PortalRequest[] {
  return [
    {
      id: "r1",
      kind: "leave",
      titleKey: "portal.reqLeaveAnnual",
      status: "pending",
      submitted: "2026-08-01",
      detail: "2026-08-18 → 2026-08-20",
    },
    {
      id: "r2",
      kind: "wfh",
      titleKey: "portal.reqWfh",
      status: "approved",
      submitted: "2026-07-28",
      detail: "2026-08-05",
    },
    {
      id: "r3",
      kind: "correction",
      titleKey: "portal.reqCorrection",
      status: "pending",
      submitted: "2026-07-25",
      detail: "2026-07-24 check-out",
    },
    {
      id: "r4",
      kind: "overtime",
      titleKey: "portal.reqOvertime",
      status: "rejected",
      submitted: "2026-07-20",
      detail: "2.5h · 2026-07-19",
    },
  ];
}

export function buildPortalTimeline(): PortalTimelineItem[] {
  return [
    {
      id: "t1",
      category: "attendance",
      titleKey: "portal.tlCheckIn",
      bodyKey: "portal.tlCheckInBody",
      at: "2026-08-03T09:05:00",
    },
    {
      id: "t2",
      category: "leave",
      titleKey: "portal.tlLeave",
      bodyKey: "portal.tlLeaveBody",
      at: "2026-08-01T11:20:00",
    },
    {
      id: "t3",
      category: "announcement",
      titleKey: "portal.tlAnnounce",
      bodyKey: "portal.tlAnnounceBody",
      at: "2026-07-30T09:00:00",
    },
    {
      id: "t4",
      category: "document",
      titleKey: "portal.tlDocument",
      bodyKey: "portal.tlDocumentBody",
      at: "2026-07-28T16:10:00",
    },
    {
      id: "t5",
      category: "training",
      titleKey: "portal.tlTraining",
      bodyKey: "portal.tlTrainingBody",
      at: "2026-07-22T14:00:00",
    },
  ];
}

export function buildPortalAchievements(): PortalAchievement[] {
  return [
    {
      id: "a1",
      titleKey: "portal.achPerfectTitle",
      bodyKey: "portal.achPerfectBody",
      earned: "2026-07",
    },
    {
      id: "a2",
      titleKey: "portal.achStreakTitle",
      bodyKey: "portal.achStreakBody",
      earned: "2026-06",
    },
    {
      id: "a3",
      titleKey: "portal.achOnboardingTitle",
      bodyKey: "portal.achOnboardingBody",
      earned: "2025-11",
    },
  ];
}

export function buildPortalEvents(): PortalEvent[] {
  return [
    {
      id: "e1",
      titleKey: "portal.eventTownhall",
      date: "2026-08-12",
      placeKey: "portal.placeHq",
    },
    {
      id: "e2",
      titleKey: "portal.eventTraining",
      date: "2026-08-19",
      placeKey: "portal.placeOnline",
    },
    {
      id: "e3",
      titleKey: "portal.eventOffsite",
      date: "2026-09-05",
      placeKey: "portal.placeCoast",
    },
  ];
}

export function buildPortalNotifications(): PortalNotification[] {
  return [
    {
      id: "n1",
      titleKey: "portal.nLeaveTitle",
      bodyKey: "portal.nLeaveBody",
      at: "2026-08-02T10:15:00",
      unread: true,
    },
    {
      id: "n2",
      titleKey: "portal.nAttendTitle",
      bodyKey: "portal.nAttendBody",
      at: "2026-08-01T18:02:00",
      unread: true,
    },
    {
      id: "n3",
      titleKey: "portal.nDocTitle",
      bodyKey: "portal.nDocBody",
      at: "2026-07-28T16:12:00",
      unread: false,
    },
    {
      id: "n4",
      titleKey: "portal.nEventTitle",
      bodyKey: "portal.nEventBody",
      at: "2026-07-25T09:00:00",
      unread: false,
    },
  ];
}

export function buildAttendanceMonthCells(seed = 7) {
  const days = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    const weekend = d % 7 === 5 || d % 7 === 6;
    if (weekend) return { day: d, level: 0 as const };
    const level = ((d + seed) % 5) as 0 | 1 | 2 | 3 | 4;
    return { day: d, level: level === 0 ? 1 : level };
  });
  return days;
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
    balance: { annual: 21, used: 8, pending: 2, sick: 5 },
    teamAvailability: [
      { name: "Sara Hassan", status: "available", dept: "Engineering" },
      { name: "Omar Nabil", status: "leave", dept: "Product" },
      { name: "Nour El-Sayed", status: "wfh", dept: "Design" },
      { name: "Karim Adel", status: "available", dept: "Finance" },
      { name: "Mona Farid", status: "leave", dept: "HR" },
      { name: "Youssef Mansour", status: "available", dept: "Operations" },
    ],
    conflicts: [
      {
        id: "c1",
        label: "Operations · 3 overlapping leaves Aug 10–12",
        severity: "high",
      },
      {
        id: "c2",
        label: "Engineering · 2 seniors off same Friday",
        severity: "med",
      },
      {
        id: "c3",
        label: "Sales · coverage thin next Monday",
        severity: "low",
      },
    ],
    coverage: [
      { day: "Sun", onLeave: 1, capacity: 24 },
      { day: "Mon", onLeave: 4, capacity: 24 },
      { day: "Tue", onLeave: 3, capacity: 24 },
      { day: "Wed", onLeave: 2, capacity: 24 },
      { day: "Thu", onLeave: 5, capacity: 24 },
    ],
    recentApprovals: [
      {
        id: "ra1",
        name: "Sara Hassan",
        type: "annual",
        result: "approved",
        at: "2026-08-02",
      },
      {
        id: "ra2",
        name: "Omar Nabil",
        type: "sick",
        result: "approved",
        at: "2026-08-01",
      },
      {
        id: "ra3",
        name: "Karim Adel",
        type: "personal",
        result: "rejected",
        at: "2026-07-30",
      },
    ],
    deptCalendar: Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      count: (i * 3 + 1) % 5,
    })),
  };
}
