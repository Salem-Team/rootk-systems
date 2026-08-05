/** Shared serializers: Prisma DateTime/Json → frontend ISO / shapes. */

export function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function isoOrNull(
  value: Date | string | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return iso(value);
}

export function dateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function parseDate(value: string): Date {
  // Accept YYYY-MM-DD or full ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

export function auditFields(entity: {
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
    companyId: entity.companyId,
    createdAt: iso(entity.createdAt),
    updatedAt: iso(entity.updatedAt),
    createdBy: entity.createdBy ?? "",
    updatedBy: entity.updatedBy ?? "",
    deletedAt: isoOrNull(entity.deletedAt),
    isArchived: entity.isArchived,
    version: entity.version,
    metadata:
      entity.metadata && typeof entity.metadata === "object"
        ? (entity.metadata as Record<string, unknown>)
        : {},
  };
}

export type EmployeeRow = {
  id: string;
  companyId: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  position: string;
  location: string | null;
  phone: string | null;
  managerName: string | null;
  joinDate: Date;
  status: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
};

/** Map Prisma Employee → frontend Employee (`employeeId` = HR code). */
export function mapEmployee(row: EmployeeRow) {
  return {
    id: row.id,
    employeeId: row.employeeCode,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    department: row.department,
    position: row.position,
    status: row.status,
    joinDate: dateOnly(row.joinDate),
    location: row.location ?? "",
    manager: row.managerName ?? undefined,
    avatar: row.avatarUrl ?? undefined,
    ...auditFields(row),
  };
}

export type UserRow = {
  id: string;
  companyId: string;
  employeeId: string | null;
  email: string;
  role: string;
  initials: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  isArchived: boolean;
  version: number;
  metadata: unknown;
};

/** Map Prisma User → frontend AppUser (keeps nameKey when stored in metadata). */
export function mapUser(row: UserRow) {
  const meta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    employeeId: row.employeeId ?? undefined,
    email: row.email,
    role: row.role,
    initials: row.initials,
    nameKey: (meta.nameKey as string) ?? "user.adminFullName",
    firstNameKey: (meta.firstNameKey as string) ?? "user.adminFirstName",
    isActive: row.isActive,
    ...auditFields(row),
  };
}
