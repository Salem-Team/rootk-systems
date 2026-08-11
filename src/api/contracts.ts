import type {
  AttendanceStatus,
  Department,
  EmployeeStatus,
  LeaveStatus,
  LeaveType,
  NotificationAudience,
  NotificationCategory,
  NotificationPriority,
  TaskPriority,
  TaskStatus,
} from "@/types";
import type { CreateNotificationInput } from "@/types/notification";
import type {
  CreateWorkMeetingDto,
  CreateWorkTaskDto,
  UpdateWorkMeetingDto,
  UpdateWorkTaskDto,
} from "@/schemas/work.schema";

/** Shared request contracts used by services + API modules + Nest DTOs. */

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  /** Cursor pagination alternative (Nest may use either). */
  cursor?: string;
}

export interface EmployeeFilters extends PaginationQuery {
  query?: string;
  department?: Department;
  status?: EmployeeStatus;
  location?: string;
}

export interface AttendanceFilters extends PaginationQuery {
  employeeId?: string;
  date?: string;
  status?: AttendanceStatus;
  from?: string;
  to?: string;
}

export interface LeaveFilters extends PaginationQuery {
  employeeId?: string;
  status?: LeaveStatus;
  type?: LeaveType;
}

export interface WorkTaskFilters extends PaginationQuery {
  employeeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  origin?: "assigned" | "personal";
  /** Manager view: tasks assigned to direct reports. */
  team?: boolean;
}

export interface WorkMeetingFilters extends PaginationQuery {
  employeeId?: string;
  date?: string;
  from?: string;
  to?: string;
}

export interface NotificationFilters extends PaginationQuery {
  role?: "admin" | "employee";
  category?: NotificationCategory;
  unreadOnly?: boolean;
}

export interface CreateLeaveInput {
  employeeId?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  department: Department;
  position: string;
  location?: string;
  phone?: string;
  joinDate: string;
  status?: EmployeeStatus;
  manager?: string;
  managerEmployeeId?: string;
  managerEmployeeIds?: string[];
  /** Optional HR code; Nest may auto-generate if omitted. */
  employeeId?: string;
  /** Initial login password (required on create). */
  password: string;
}

export interface UpdateEmployeeInput extends Partial<Omit<CreateEmployeeInput, "password">> {
  version?: number;
  /** Optional admin password reset. */
  password?: string;
}

export type CreateWorkTaskInput = CreateWorkTaskDto;
export type UpdateWorkTaskInput = UpdateWorkTaskDto;
export type CreateWorkMeetingInput = CreateWorkMeetingDto;
export type UpdateWorkMeetingInput = UpdateWorkMeetingDto;

export type PushNotificationInput = CreateNotificationInput;

export interface UpdateNotificationPrefsInput {
  email?: boolean;
  push?: boolean;
  sound?: boolean;
  attendanceReminders?: boolean;
  leaveUpdates?: boolean;
  announcements?: boolean;
  system?: boolean;
}

export interface SaveUserPreferencesInput {
  language?: "en" | "ar";
  appearance?: "system" | "light" | "dark";
  notifications?: UpdateNotificationPrefsInput;
}

/** Auth payloads expected from Nest (also used by auth.api). */
export interface AuthTokensDto {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthSessionDto {
  user: import("@/types").AppUser;
  role: import("@/types").UserRole;
  tokens: AuthTokensDto;
}

/** Nest list responses may be bare arrays or paginated envelopes. */
export type ListPayload<T> = T[] | { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export function unwrapList<T>(payload: ListPayload<T> | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.items ?? [];
}

export type {
  NotificationAudience,
  NotificationCategory,
  NotificationPriority,
};
