import type { BaseEntity } from "@/types";
import type {
  TargetHealth,
  TargetProgressMetrics,
  TargetRiskLevel,
} from "@/lib/target-progress";

export type TargetStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "on_track"
  | "behind_schedule"
  | "delayed"
  | "completed"
  | "cancelled"
  | "archived";

export type TargetPriority = "critical" | "high" | "medium" | "low";

export type TargetAssigneeScope =
  | "employee"
  | "department"
  | "role"
  | "team"
  | "branch"
  | "multi";

export type TargetPenaltyType =
  | "written_warning"
  | "salary_deduction"
  | "performance_note"
  | "bonus_reduction"
  | "manager_review"
  | "custom";

export type { TargetHealth, TargetRiskLevel };

export interface TargetCategory extends BaseEntity {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

export interface TargetType extends BaseEntity {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  taskTitleTemplate: string;
  active: boolean;
  sortOrder: number;
}

export interface TargetTemplateItem {
  id: string;
  companyId: string;
  templateId: string;
  typeId: string;
  quantity: number;
  unit: string;
  weight: number;
  sortOrder: number;
}

export interface TargetTemplate extends BaseEntity {
  id: string;
  categoryId: string | null;
  name: string;
  description: string;
  active: boolean;
  items: TargetTemplateItem[];
}

/** Assigned performance target — progress derived from WorkTasks. */
export interface PerformanceTarget extends BaseEntity {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  typeId: string;
  templateId: string | null;
  quantity: number;
  unit: string;
  completedQuantity: number;
  startDate: string;
  endDate: string;
  priority: TargetPriority;
  weight: number;
  assigneeScope: TargetAssigneeScope;
  assigneeIds: string[];
  department: string;
  branch: string;
  roleKey: string;
  ownerId: string;
  status: TargetStatus;
  health: TargetHealth;
  riskLevel: TargetRiskLevel;
  notes: string;
  expectedCompletion: string | null;
  performanceScore: number;
  /** ISO timestamp when assigned (null while draft). */
  assignedAt?: string | null;
  /** ISO timestamp when fully completed. */
  completedAt?: string | null;
  /** Computed client/server metrics (not persisted). */
  metrics?: TargetProgressMetrics;
}

export interface TargetWarning extends BaseEntity {
  id: string;
  targetId: string;
  employeeId: string;
  reason: string;
  managerNotes: string;
  requiredAction: string;
  penaltyType: TargetPenaltyType;
  penaltyNote: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export interface TargetHistoryEvent extends BaseEntity {
  id: string;
  targetId: string;
  action: string;
  actorId: string;
  note: string;
  snapshot: Record<string, unknown>;
}

export interface TargetFilters {
  employeeId?: string;
  /** Manager view: targets assigned to direct reports. */
  team?: boolean;
  department?: string;
  branch?: string;
  roleKey?: string;
  categoryId?: string;
  typeId?: string;
  priority?: TargetPriority | "";
  status?: TargetStatus | "";
  riskLevel?: TargetRiskLevel | "";
  minProgress?: number;
  maxProgress?: number;
  minPerformance?: number;
  maxPerformance?: number;
  createdBy?: string;
  assignedBy?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  deadline?: string;
  delayedOnly?: boolean;
  completedOnly?: boolean;
  hasWarning?: boolean;
  hasPenalty?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TargetDashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  delayed: number;
  critical: number;
  completionRate: number;
  averagePerformance: number;
  employeesAtRisk: number;
  upcomingDeadlines: number;
  byCategory: Array<{ id: string; name: string; color: string; count: number }>;
  byStatus: Array<{ status: TargetStatus; count: number }>;
  byDepartment: Array<{ department: string; count: number; avgScore: number }>;
  topPerformers: Array<{
    employeeId: string;
    score: number;
    completed: number;
    total: number;
  }>;
  bottomPerformers: Array<{
    employeeId: string;
    score: number;
    completed: number;
    total: number;
  }>;
  completionTrend: Array<{ date: string; completed: number; created: number }>;
}

export interface EmployeeTargetPerformance {
  employeeId: string;
  overallScore: number;
  currentTargets: number;
  completed: number;
  remaining: number;
  warnings: number;
  delayedTasks: number;
  monthlyTrend: Array<{ month: string; score: number }>;
  targets: PerformanceTarget[];
}

export type TargetCapability =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "assign"
  | "manage_categories"
  | "manage_types"
  | "manage_templates"
  | "view_dashboard"
  | "view_reports"
  | "send_warnings"
  | "manage_penalties"
  | "view_delayed"
  | "export";
