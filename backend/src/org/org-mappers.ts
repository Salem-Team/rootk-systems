import type {
  ApprovalRule,
  Department,
  JobPosition,
  OfficeLocation,
  ShiftDefinition,
} from "@prisma/client";
import { auditFields } from "../common/mappers";

export function mapLoc(row: OfficeLocation) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    timezone: row.timezone,
    capacity: row.capacity,
    workingDays: row.workingDays,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    radiusMeters: row.radiusMeters,
    active: row.active,
    ...auditFields(row),
  };
}

export function mapDept(row: Department) {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.nameAr ?? undefined,
    code: row.code ?? undefined,
    color: row.color,
    active: row.active,
    ...auditFields(row),
  };
}

export function mapPos(row: JobPosition) {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    grade: row.grade,
    reportsTo: row.reportsTo,
    active: row.active,
    ...auditFields(row),
  };
}

export function mapShift(row: ShiftDefinition) {
  return {
    id: row.id,
    name: row.name,
    nameKey: row.nameKey ?? undefined,
    type: row.type,
    start: row.start,
    end: row.end,
    color: row.color,
    active: row.active,
    ...auditFields(row),
  };
}

export function mapApproval(row: ApprovalRule) {
  return {
    id: row.id,
    labelKey: row.labelKey,
    requiresApproval: row.requiresApproval,
    approver: row.approver,
    ...auditFields(row),
  };
}
