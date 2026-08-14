export type UserRole = "admin" | "employee";
export type EmployeeStatus = "active" | "inactive" | "on_leave";
export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "wfh"
  | "early_leave"
  | "half_day"
  | "on_leave";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveType =
  | "annual"
  | "sick"
  | "personal"
  | "unpaid"
  | "maternity"
  | "emergency";
/** Department name stored on employees/positions (denormalized from org catalog). */
export type Department = string;
export type ViewMode = "grid" | "table";
export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

/** Free-form JSON bag — mirrors Prisma Json / PostgreSQL jsonb. */
export type EntityMetadata = Record<string, unknown>;

/**
 * Production audit fields shared by every persisted entity.
 * Compatible with NestJS + Prisma + PostgreSQL models.
 */
export interface BaseEntity {
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt: string | null;
  isArchived: boolean;
  version: number;
  metadata: EntityMetadata;
}

export interface Employee extends BaseEntity {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  department: Department;
  position: string;
  status: EmployeeStatus;
  joinDate: string;
  location: string;
  manager?: string;
  /** Employee.id values of direct managers. */
  managerEmployeeIds?: string[];
  /** First direct manager — legacy alias of `managerEmployeeIds[0]`. */
  managerEmployeeId?: string;
}

export interface AttendanceRecord extends BaseEntity {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  workingMinutes: number;
  /** Gross elapsed before unpaid break (optional — older rows may omit). */
  grossMinutes?: number;
  /** Unpaid break deducted from gross (optional). */
  breakAppliedMinutes?: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  lateMinutes: number;
  /** Minutes left before scheduled end (0 when on time). */
  earlyLeaveMinutes?: number;
  /** Minutes worked after scheduled end. */
  overtimeMinutes?: number;
  note?: string;
}

export interface LeaveRequest extends BaseEntity {
  id: string;
  employeeId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface Holiday extends BaseEntity {
  id: string;
  name: string;
  date: string;
  type: "holiday" | "event";
  description?: string;
}

export interface WorkSchedule extends BaseEntity {
  id: string;
  workingDays: DayOfWeek[];
  weekendDays: DayOfWeek[];
  wfhDays: DayOfWeek[];
  fromTime: string;
  toTime: string;
  gracePeriodMinutes: number;
  breakMinutes: number;
  holidays: Holiday[];
}

export interface CompanySettings extends BaseEntity {
  id: string;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  timezone: string;
  currency: string;
  language: "en" | "ar";
  appearance: "system" | "light" | "dark";
  notifications: import("@/lib/notification-policy").CompanyNotificationSettings;
}

export type * from "@/types/org";
export type * from "@/types/preferences";
export type * from "@/types/employee-profile";

/** Known dashboard feed types — DB/API may also emit module-specific strings. */
export type ActivityType =
  | "check_in"
  | "check_out"
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "announcement"
  | "late"
  | (string & {});

export interface Activity extends BaseEntity {
  id: string;
  /** Free-form; attendance/leave use fixed slugs, CRM/ads may use `crm_*` / `organic_ad`. */
  type: ActivityType;
  employeeId?: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface Announcement extends BaseEntity {
  id: string;
  title: string;
  body: string;
  author: string;
  priority: "low" | "medium" | "high";
}

export interface DashboardStats {
  present: number;
  absent: number;
  late: number;
  wfh: number;
  onLeave: number;
  attendanceRate: number;
  totalEmployees: number;
}

export interface WeeklyStat extends BaseEntity {
  id: string;
  day: string;
  present: number;
  late: number;
  absent: number;
  wfh: number;
}

export interface MonthlyStat extends BaseEntity {
  id: string;
  month: string;
  attendanceRate: number;
  lateCount: number;
  absentCount: number;
  avgHours: number;
}

/** REST-shaped envelope used by services (mirrors future NestJS responses). */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: {
    code: string;
    details?: unknown;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

/** Auth/session principal — maps to future JWT user + Prisma User. */
export interface AppUser extends BaseEntity {
  id: string;
  employeeId: string;
  email: string;
  role: UserRole;
  initials: string;
  /** Real account name from DB (preferred in UI). */
  displayName?: string;
  firstName?: string;
  lastName?: string;
  /** Legacy i18n keys — demo/local fallback only. */
  nameKey: string;
  firstNameKey: string;
  isActive: boolean;
}

export type * from "@/types/notification";
export type * from "@/types/payroll";
export type * from "@/types/work";
export type * from "@/types/targets";
export type * from "@/types/organic-ads";
export type * from "@/types/daily-plan";
export type * from "@/types/daily-report";
export type * from "@/types/crm";
export type * from "@/types/user-accounts";
