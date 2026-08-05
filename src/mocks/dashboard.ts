import type {
  Activity,
  Announcement,
  DashboardStats,
  MonthlyStat,
  WeeklyStat,
} from "@/types";
import type { SeedOf } from "@/types/seed";

export const dashboardStatsSeed: DashboardStats = {
  present: 9,
  absent: 1,
  late: 3,
  wfh: 2,
  onLeave: 1,
  attendanceRate: 87.5,
  totalEmployees: 16,
};

export const weeklyStatsSeed: SeedOf<WeeklyStat>[] = [
  { id: "week_sun", day: "Sun", present: 10, late: 2, absent: 1, wfh: 2 },
  { id: "week_mon", day: "Mon", present: 9, late: 3, absent: 1, wfh: 2 },
  { id: "week_tue", day: "Tue", present: 11, late: 1, absent: 0, wfh: 2 },
  { id: "week_wed", day: "Wed", present: 4, late: 1, absent: 1, wfh: 8 },
  { id: "week_thu", day: "Thu", present: 10, late: 2, absent: 1, wfh: 2 },
];

export const monthlyStatsSeed: SeedOf<MonthlyStat>[] = [
  {
    id: "month_mar",
    month: "Mar",
    attendanceRate: 91.2,
    lateCount: 18,
    absentCount: 6,
    avgHours: 8.1,
  },
  {
    id: "month_apr",
    month: "Apr",
    attendanceRate: 89.5,
    lateCount: 22,
    absentCount: 8,
    avgHours: 8.0,
  },
  {
    id: "month_may",
    month: "May",
    attendanceRate: 86.8,
    lateCount: 15,
    absentCount: 12,
    avgHours: 7.6,
  },
  {
    id: "month_jun",
    month: "Jun",
    attendanceRate: 90.1,
    lateCount: 20,
    absentCount: 7,
    avgHours: 8.2,
  },
  {
    id: "month_jul",
    month: "Jul",
    attendanceRate: 88.4,
    lateCount: 24,
    absentCount: 9,
    avgHours: 8.0,
  },
  {
    id: "month_aug",
    month: "Aug",
    attendanceRate: 87.5,
    lateCount: 3,
    absentCount: 1,
    avgHours: 0,
  },
];

export const activitiesSeed: SeedOf<Activity>[] = [
  {
    id: "act-001",
    type: "check_in",
    employeeId: "emp-002",
    title: "Noura El-Hariry checked in",
    description: "Arrived at 08:55 — New Cairo HQ",
    timestamp: "2026-08-02T08:55:00+03:00",
  },
  {
    id: "act-002",
    type: "check_in",
    employeeId: "emp-006",
    title: "Hana Farouk checked in",
    description: "Arrived at 08:48 — New Cairo HQ",
    timestamp: "2026-08-02T08:48:00+03:00",
  },
  {
    id: "act-003",
    type: "check_in",
    employeeId: "emp-001",
    title: "Salem El-Rashidy checked in",
    description: "Arrived at 09:08 — New Cairo HQ",
    timestamp: "2026-08-02T09:08:00+03:00",
  },
  {
    id: "act-004",
    type: "late",
    employeeId: "emp-003",
    title: "Yousef Mansour arrived late",
    description: "Checked in at 09:32 — 17 minutes late",
    timestamp: "2026-08-02T09:32:00+03:00",
  },
  {
    id: "act-005",
    type: "check_in",
    employeeId: "emp-014",
    title: "Ahmed Bakri checked in (WFH)",
    description: "Remote check-in at 09:03",
    timestamp: "2026-08-02T09:03:00+03:00",
  },
  {
    id: "act-006",
    type: "leave_request",
    employeeId: "emp-008",
    title: "New leave request",
    description: "Khaled Nasser submitted a 2-day sick leave request",
    timestamp: "2026-08-01T08:30:00+03:00",
  },
  {
    id: "act-007",
    type: "leave_request",
    employeeId: "emp-003",
    title: "New leave request",
    description: "Yousef Mansour requested 5 days of annual leave",
    timestamp: "2026-07-28T10:15:00+03:00",
  },
  {
    id: "act-008",
    type: "leave_approved",
    employeeId: "emp-011",
    title: "Leave approved",
    description: "Maya Saleh's annual leave (Jul 27 – Aug 7) was approved",
    timestamp: "2026-07-12T11:20:00+03:00",
  },
  {
    id: "act-009",
    type: "leave_rejected",
    employeeId: "emp-005",
    title: "Leave rejected",
    description: "Omar Khalil's personal leave was rejected due to product launch",
    timestamp: "2026-07-26T09:15:00+03:00",
  },
  {
    id: "act-010",
    type: "announcement",
    title: "Q3 goals published",
    description: "Leadership shared the Q3 OKRs on the company board",
    timestamp: "2026-07-16T16:00:00+03:00",
  },
  {
    id: "act-011",
    type: "check_out",
    employeeId: "emp-001",
    title: "Salem El-Rashidy checked out",
    description: "Left at 18:12 on Jul 30",
    timestamp: "2026-07-30T18:12:00+03:00",
  },
  {
    id: "act-012",
    type: "late",
    employeeId: "emp-008",
    title: "Khaled Nasser arrived late",
    description: "Checked in at 09:40 — 25 minutes late",
    timestamp: "2026-08-02T09:40:00+03:00",
  },
];

/** Announcement.createdAt is the domain publish time — kept on seed rows. */
export type AnnouncementSeed = Omit<SeedOf<Announcement>, never> & {
  createdAt: string;
};

export const announcementsSeed: AnnouncementSeed[] = [
  {
    id: "ann-001",
    title: "Ramadan working hours reminder",
    body: "During Ramadan, office hours shift to 10:00–15:00. WFH Wednesdays remain optional. Please update your calendar invites accordingly.",
    author: "Rania Adel",
    createdAt: "2026-02-10T09:00:00+03:00",
    priority: "high",
  },
  {
    id: "ann-002",
    title: "Onboarding Bootcamp — August 10",
    body: "New joiners will attend a full-day onboarding bootcamp at New Cairo HQ. Managers: please ensure buddies are assigned by August 5.",
    author: "Rania Adel",
    createdAt: "2026-07-28T11:00:00+03:00",
    priority: "medium",
  },
  {
    id: "ann-003",
    title: "Office parking update",
    body: "Visitor parking on Level B1 is temporarily closed for renovation through August 15. Use Level B2 or nearby valet partners.",
    author: "Tariq Zidan",
    createdAt: "2026-07-30T14:30:00+03:00",
    priority: "low",
  },
  {
    id: "ann-004",
    title: "Q3 OKRs now live",
    body: "Department OKRs for Q3 are published in Notion. Please review with your manager before August 5 syncs.",
    author: "Hana Farouk",
    createdAt: "2026-07-16T16:00:00+03:00",
    priority: "high",
  },
  {
    id: "ann-005",
    title: "Health insurance renewal",
    body: "Bupa policy renews September 1. HR will collect dependent updates until August 20. Contact rania@rootk.systems for changes.",
    author: "Rania Adel",
    createdAt: "2026-08-01T10:00:00+03:00",
    priority: "medium",
  },
];
