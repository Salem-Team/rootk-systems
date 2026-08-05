import type { Department } from "@/types";

export type AdminSection =
  | "profile"
  | "policies"
  | "shifts"
  | "wfh"
  | "departments"
  | "positions"
  | "locations"
  | "calendar"
  | "notifications"
  | "approvals"
  | "employeePrefs"
  | "appearance"
  | "demo";

export interface OfficeBranch {
  id: string;
  name: string;
  city: string;
  address: string;
  timezone: string;
  capacity: number;
  workingDays: string;
}

export interface ShiftDefinition {
  id: string;
  nameKey: string;
  type: "morning" | "evening" | "night" | "flexible" | "hybrid" | "remote";
  start: string;
  end: string;
  color: string;
}

export interface DepartmentAdminCard {
  department: Department;
  manager: string;
  employees: number;
  active: boolean;
  presentRate: number;
  color: string;
}

export interface JobPosition {
  id: string;
  title: string;
  department: Department;
  grade: string;
  reportsTo: string;
}

export interface PolicyState {
  workingDays: string[];
  weekend: string[];
  graceMinutes: number;
  breakMinutes: number;
  minHours: number;
  maxHours: number;
  overtimeAfterHours: number;
  lateAfterMinutes: number;
  halfDayHours: number;
}

export interface WfhPolicy {
  enabled: boolean;
  allowedDepartments: Department[];
  allowedDays: string[];
  requiresApproval: boolean;
  monthlyQuota: number;
  hybridOfficeDays: number;
}

export interface ApprovalRule {
  id: string;
  labelKey: string;
  requiresApproval: boolean;
  approver: string;
}

export interface CalendarAdminEvent {
  id: string;
  date: string;
  title: string;
  kind: "holiday" | "event" | "training" | "meeting" | "birthday";
}

export const ADMIN_SHIFTS: ShiftDefinition[] = [
  {
    id: "sh-1",
    nameKey: "admin.shiftMorning",
    type: "morning",
    start: "09:00",
    end: "17:00",
    color: "bg-amber-500",
  },
  {
    id: "sh-2",
    nameKey: "admin.shiftEvening",
    type: "evening",
    start: "14:00",
    end: "22:00",
    color: "bg-orange-500",
  },
  {
    id: "sh-3",
    nameKey: "admin.shiftNight",
    type: "night",
    start: "22:00",
    end: "06:00",
    color: "bg-indigo-500",
  },
  {
    id: "sh-4",
    nameKey: "admin.shiftFlexible",
    type: "flexible",
    start: "08:00",
    end: "18:00",
    color: "bg-teal-500",
  },
  {
    id: "sh-5",
    nameKey: "admin.shiftHybrid",
    type: "hybrid",
    start: "09:00",
    end: "17:00",
    color: "bg-sky-500",
  },
  {
    id: "sh-6",
    nameKey: "admin.shiftRemote",
    type: "remote",
    start: "10:00",
    end: "18:00",
    color: "bg-primary",
  },
];

export const ADMIN_BRANCHES: OfficeBranch[] = [
  {
    id: "br-1",
    name: "ROOTK Cairo HQ",
    city: "Cairo",
    address: "New Cairo, Street 90, Building 12",
    timezone: "Africa/Cairo",
    capacity: 120,
    workingDays: "Sun–Thu",
  },
  {
    id: "br-2",
    name: "Alexandria Hub",
    city: "Alexandria",
    address: "Smouha Business Park, Floor 4",
    timezone: "Africa/Cairo",
    capacity: 40,
    workingDays: "Sun–Thu",
  },
  {
    id: "br-3",
    name: "Giza Studio",
    city: "Giza",
    address: "Smart Village, Bldg B2",
    timezone: "Africa/Cairo",
    capacity: 28,
    workingDays: "Sun–Thu",
  },
];

export const ADMIN_DEPARTMENTS: DepartmentAdminCard[] = [
  {
    department: "Engineering",
    manager: "Noura El-Hariry",
    employees: 6,
    active: true,
    presentRate: 94,
    color: "bg-primary",
  },
  {
    department: "Design",
    manager: "Layla Hassan",
    employees: 3,
    active: true,
    presentRate: 91,
    color: "bg-sky-500",
  },
  {
    department: "Product",
    manager: "Omar Farouk",
    employees: 2,
    active: true,
    presentRate: 96,
    color: "bg-teal-500",
  },
  {
    department: "HR",
    manager: "Rania Adel",
    employees: 2,
    active: true,
    presentRate: 98,
    color: "bg-amber-500",
  },
  {
    department: "Finance",
    manager: "Sara Ibrahim",
    employees: 2,
    active: true,
    presentRate: 89,
    color: "bg-slate-500",
  },
  {
    department: "Marketing",
    manager: "Maya Saleh",
    employees: 2,
    active: true,
    presentRate: 87,
    color: "bg-rose-500",
  },
  {
    department: "Operations",
    manager: "Tariq Zidan",
    employees: 1,
    active: true,
    presentRate: 92,
    color: "bg-orange-500",
  },
  {
    department: "Sales",
    manager: "Dina Mahmoud",
    employees: 1,
    active: true,
    presentRate: 90,
    color: "bg-emerald-500",
  },
];

export const ADMIN_POSITIONS: JobPosition[] = [
  {
    id: "pos-1",
    title: "Engineering Manager",
    department: "Engineering",
    grade: "L6",
    reportsTo: "CEO",
  },
  {
    id: "pos-2",
    title: "Senior Software Engineer",
    department: "Engineering",
    grade: "L5",
    reportsTo: "Engineering Manager",
  },
  {
    id: "pos-3",
    title: "Frontend Engineer",
    department: "Engineering",
    grade: "L3",
    reportsTo: "Engineering Manager",
  },
  {
    id: "pos-4",
    title: "Design Lead",
    department: "Design",
    grade: "L5",
    reportsTo: "Head of Product",
  },
  {
    id: "pos-5",
    title: "Product Manager",
    department: "Product",
    grade: "L4",
    reportsTo: "Head of Product",
  },
  {
    id: "pos-6",
    title: "HR Business Partner",
    department: "HR",
    grade: "L4",
    reportsTo: "CEO",
  },
  {
    id: "pos-7",
    title: "Finance Director",
    department: "Finance",
    grade: "L6",
    reportsTo: "CEO",
  },
  {
    id: "pos-8",
    title: "Growth Marketer",
    department: "Marketing",
    grade: "L3",
    reportsTo: "Marketing Manager",
  },
];

export const DEFAULT_POLICY: PolicyState = {
  workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  weekend: ["friday", "saturday"],
  graceMinutes: 15,
  breakMinutes: 45,
  minHours: 7,
  maxHours: 10,
  overtimeAfterHours: 9,
  lateAfterMinutes: 15,
  halfDayHours: 4,
};

export const DEFAULT_WFH: WfhPolicy = {
  enabled: true,
  allowedDepartments: ["Engineering", "Design", "Product", "Marketing"],
  allowedDays: ["sunday", "wednesday"],
  requiresApproval: true,
  monthlyQuota: 8,
  hybridOfficeDays: 3,
};

export const APPROVAL_RULES: ApprovalRule[] = [
  {
    id: "ap-1",
    labelKey: "admin.approvalAttendance",
    requiresApproval: false,
    approver: "Direct manager",
  },
  {
    id: "ap-2",
    labelKey: "admin.approvalLeave",
    requiresApproval: true,
    approver: "HR + Manager",
  },
  {
    id: "ap-3",
    labelKey: "admin.approvalWfh",
    requiresApproval: true,
    approver: "Direct manager",
  },
  {
    id: "ap-4",
    labelKey: "admin.approvalOvertime",
    requiresApproval: true,
    approver: "Department head",
  },
];

export const ADMIN_CALENDAR: CalendarAdminEvent[] = [
  {
    id: "ce-1",
    date: "2026-08-10",
    title: "Team all-hands",
    kind: "meeting",
  },
  {
    id: "ce-2",
    date: "2026-08-15",
    title: "Security training",
    kind: "training",
  },
  {
    id: "ce-3",
    date: "2026-08-21",
    title: "Noura El-Hariry birthday",
    kind: "birthday",
  },
  {
    id: "ce-4",
    date: "2026-09-01",
    title: "Company offsite planning",
    kind: "event",
  },
  {
    id: "ce-5",
    date: "2026-10-06",
    title: "Armed Forces Day",
    kind: "holiday",
  },
];

export const BRAND_PREVIEW = "#082868";
