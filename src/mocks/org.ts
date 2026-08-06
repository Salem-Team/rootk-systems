import {
  ADMIN_BRANCHES,
  ADMIN_POSITIONS,
  ADMIN_SHIFTS,
  APPROVAL_RULES,
} from "@/components/admin/admin-mock-data";
import { DEPARTMENTS } from "@/constants";
import type {
  ApprovalRule,
  JobPosition,
  OfficeLocation,
  OrgDepartment,
  ShiftDefinition,
} from "@/types/org";
import type { SeedOf } from "@/types/seed";

const DEPT_META: Record<
  string,
  { nameAr: string; code: string; color: string }
> = {
  Engineering: { nameAr: "الهندسة", code: "ENG", color: "#082868" },
  Design: { nameAr: "التصميم", code: "DES", color: "#0ea5e9" },
  Product: { nameAr: "المنتج", code: "PRD", color: "#14b8a6" },
  HR: { nameAr: "الموارد البشرية", code: "HR", color: "#f59e0b" },
  Finance: { nameAr: "المالية", code: "FIN", color: "#64748b" },
  Marketing: { nameAr: "التسويق", code: "MKT", color: "#f43f5e" },
  Operations: { nameAr: "العمليات", code: "OPS", color: "#f97316" },
  Sales: { nameAr: "المبيعات", code: "SAL", color: "#10b981" },
};

export const orgDepartmentsSeed: SeedOf<OrgDepartment>[] = DEPARTMENTS.map(
  (name, index) => {
    const meta = DEPT_META[name] ?? {
      nameAr: name,
      code: name.slice(0, 3).toUpperCase(),
      color: "#082868",
    };
    return {
      id: `dept-${index + 1}`,
      name,
      nameAr: meta.nameAr,
      code: meta.code,
      color: meta.color,
      active: true,
    };
  }
);

export const officeLocationsSeed: SeedOf<OfficeLocation>[] =
  ADMIN_BRANCHES.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
    address: b.address,
    timezone: b.timezone,
    capacity: b.capacity,
    workingDays: b.workingDays,
    latitude: b.latitude,
    longitude: b.longitude,
    radiusMeters: b.radiusMeters ?? 200,
    active: true,
  }));

export const jobPositionsSeed: SeedOf<JobPosition>[] = ADMIN_POSITIONS.map(
  (p) => ({
    id: p.id,
    title: p.title,
    department: p.department,
    grade: p.grade,
    reportsTo: p.reportsTo,
    active: true,
  })
);

export const shiftsSeed: SeedOf<ShiftDefinition>[] = ADMIN_SHIFTS.map((s) => ({
  id: s.id,
  name: s.nameKey.replace("admin.shift", ""),
  nameKey: s.nameKey,
  type: s.type,
  start: s.start,
  end: s.end,
  color: s.color,
  active: true,
}));

export const approvalRulesSeed: SeedOf<ApprovalRule>[] = APPROVAL_RULES.map(
  (r) => ({
    id: r.id,
    labelKey: r.labelKey,
    requiresApproval: r.requiresApproval,
    approver: r.approver,
  })
);
