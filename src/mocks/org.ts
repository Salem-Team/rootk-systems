import {
  ADMIN_BRANCHES,
  ADMIN_POSITIONS,
  ADMIN_SHIFTS,
  APPROVAL_RULES,
} from "@/components/admin/admin-mock-data";
import type {
  ApprovalRule,
  JobPosition,
  OfficeLocation,
  ShiftDefinition,
} from "@/types/org";
import type { SeedOf } from "@/types/seed";

export const officeLocationsSeed: SeedOf<OfficeLocation>[] =
  ADMIN_BRANCHES.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
    address: b.address,
    timezone: b.timezone,
    capacity: b.capacity,
    workingDays: b.workingDays,
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
