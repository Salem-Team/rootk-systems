/** Row → DTO mappers shared across Targets domain services. */
import {
  TargetAssigneeScope,
  TargetHealth,
  TargetPenaltyType,
  TargetPriority,
  TargetRiskLevel,
  TargetStatus,
} from "@prisma/client";
import { auditFields, iso, isoOrNull } from "../common/mappers";
import { computeTargetProgress } from "../lib/target-progress";

export function mapCategory(row: {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  active: boolean;
  sortOrder: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    description: row.description,
    active: row.active,
    sortOrder: row.sortOrder,
    ...auditFields(row),
  };
}

export function mapType(row: {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  taskTitleTemplate: string;
  active: boolean;
  sortOrder: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    unit: row.unit,
    taskTitleTemplate: row.taskTitleTemplate,
    active: row.active,
    sortOrder: row.sortOrder,
    ...auditFields(row),
  };
}

export function mapTemplateItem(row: {
  id: string;
  companyId: string;
  templateId: string;
  typeId: string;
  quantity: number;
  unit: string;
  weight: number;
  sortOrder: number;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    templateId: row.templateId,
    typeId: row.typeId,
    quantity: row.quantity,
    unit: row.unit,
    weight: row.weight,
    sortOrder: row.sortOrder,
  };
}

export function mapTarget(row: {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  typeId: string;
  templateId: string | null;
  quantity: number;
  unit: string;
  completedQuantity: number;
  startDate: Date;
  endDate: Date;
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
  expectedCompletion: Date | null;
  performanceScore: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  const metrics = computeTargetProgress({
    quantity: row.quantity,
    completedQuantity: row.completedQuantity,
    startDate: iso(row.startDate),
    endDate: iso(row.endDate),
    status: row.status,
  });
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    typeId: row.typeId,
    templateId: row.templateId,
    quantity: row.quantity,
    unit: row.unit,
    completedQuantity: row.completedQuantity,
    startDate: iso(row.startDate),
    endDate: iso(row.endDate),
    priority: row.priority,
    weight: row.weight,
    assigneeScope: row.assigneeScope,
    assigneeIds: row.assigneeIds,
    department: row.department,
    branch: row.branch,
    roleKey: row.roleKey,
    ownerId: row.ownerId,
    status: row.status,
    health: row.health,
    riskLevel: row.riskLevel,
    notes: row.notes,
    expectedCompletion: row.expectedCompletion
      ? iso(row.expectedCompletion)
      : null,
    performanceScore: row.performanceScore,
    metrics,
    ...auditFields(row),
  };
}

export type MappedTarget = ReturnType<typeof mapTarget>;

export function mapWarning(row: {
  id: string;
  targetId: string;
  employeeId: string;
  reason: string;
  managerNotes: string;
  requiredAction: string;
  penaltyType: TargetPenaltyType;
  penaltyNote: string;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
}) {
  return {
    id: row.id,
    targetId: row.targetId,
    employeeId: row.employeeId,
    reason: row.reason,
    managerNotes: row.managerNotes,
    requiredAction: row.requiredAction,
    penaltyType: row.penaltyType,
    penaltyNote: row.penaltyNote,
    acknowledgedAt: isoOrNull(row.acknowledgedAt),
    acknowledgedBy: row.acknowledgedBy,
    ...auditFields(row),
  };
}
