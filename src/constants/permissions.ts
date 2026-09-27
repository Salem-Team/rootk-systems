import { AppRole } from "@/constants/roles";
import type { UserRole } from "@/types";

export const PERMISSION_MODULES = [
  "dataAccess",
  "dashboard",
  "attendance",
  "dailyPlan",
  "tasks",
  "targets",
  "team",
  "organicAds",
  "crm",
  "employees",
  "schedule",
  "leave",
  "payroll",
  "reports",
  "settings",
  "notifications",
] as const;

export type PermissionModuleId = (typeof PERMISSION_MODULES)[number];

export interface PermissionDefinition {
  id: string;
  module: PermissionModuleId;
  employeeDefault: boolean;
}

/**
 * Fine-grained catalog. UI labels are i18n (`permissions.items.*`) — never show the id.
 * Admin role grants every id unless a per-user override denies it.
 */
export const PERMISSION_CATALOG = [
  // Data access
  { id: "dataAccess.viewOtherUsers", module: "dataAccess", employeeDefault: false },
  { id: "dataAccess.viewUserDirectory", module: "dataAccess", employeeDefault: true },
  { id: "dataAccess.viewOtherProfiles", module: "dataAccess", employeeDefault: false },

  // Dashboard
  { id: "dashboard.view", module: "dashboard", employeeDefault: true },
  { id: "dashboard.viewCompanyStats", module: "dashboard", employeeDefault: false },
  { id: "dashboard.viewTeamStats", module: "dashboard", employeeDefault: false },

  // Attendance
  { id: "attendance.viewOwn", module: "attendance", employeeDefault: true },
  { id: "attendance.viewTeam", module: "attendance", employeeDefault: false },
  { id: "attendance.viewAll", module: "attendance", employeeDefault: false },
  { id: "attendance.checkIn", module: "attendance", employeeDefault: true },
  { id: "attendance.checkOut", module: "attendance", employeeDefault: true },
  { id: "attendance.editRecords", module: "attendance", employeeDefault: false },
  { id: "attendance.editTeamRecords", module: "attendance", employeeDefault: false },
  { id: "attendance.export", module: "attendance", employeeDefault: false },

  // Daily plan
  { id: "dailyPlan.viewOwn", module: "dailyPlan", employeeDefault: true },
  { id: "dailyPlan.viewTeam", module: "dailyPlan", employeeDefault: false },
  { id: "dailyPlan.viewAll", module: "dailyPlan", employeeDefault: false },
  { id: "dailyPlan.editCompanyPlan", module: "dailyPlan", employeeDefault: false },
  { id: "dailyPlan.viewReports", module: "dailyPlan", employeeDefault: false },

  // Tasks
  { id: "tasks.viewOwn", module: "tasks", employeeDefault: true },
  { id: "tasks.viewTeam", module: "tasks", employeeDefault: false },
  { id: "tasks.viewAll", module: "tasks", employeeDefault: false },
  { id: "tasks.create", module: "tasks", employeeDefault: true },
  { id: "tasks.editOwn", module: "tasks", employeeDefault: true },
  { id: "tasks.editTeam", module: "tasks", employeeDefault: false },
  { id: "tasks.editOthers", module: "tasks", employeeDefault: false },
  { id: "tasks.deleteOwn", module: "tasks", employeeDefault: true },
  { id: "tasks.deleteTeam", module: "tasks", employeeDefault: false },
  { id: "tasks.deleteOthers", module: "tasks", employeeDefault: false },
  { id: "tasks.assign", module: "tasks", employeeDefault: false },
  { id: "tasks.manageMeetings", module: "tasks", employeeDefault: true },

  // Targets
  { id: "targets.viewOwn", module: "targets", employeeDefault: true },
  { id: "targets.viewTeam", module: "targets", employeeDefault: false },
  { id: "targets.viewAll", module: "targets", employeeDefault: false },
  { id: "targets.create", module: "targets", employeeDefault: false },
  { id: "targets.edit", module: "targets", employeeDefault: false },
  { id: "targets.delete", module: "targets", employeeDefault: false },
  { id: "targets.assign", module: "targets", employeeDefault: false },
  { id: "targets.manageCategories", module: "targets", employeeDefault: false },
  { id: "targets.manageTypes", module: "targets", employeeDefault: false },
  { id: "targets.manageTemplates", module: "targets", employeeDefault: false },
  { id: "targets.viewDashboard", module: "targets", employeeDefault: true },
  { id: "targets.viewReports", module: "targets", employeeDefault: false },
  { id: "targets.sendWarnings", module: "targets", employeeDefault: false },
  { id: "targets.managePenalties", module: "targets", employeeDefault: false },
  { id: "targets.viewDelayed", module: "targets", employeeDefault: true },
  { id: "targets.export", module: "targets", employeeDefault: false },

  // Team
  { id: "team.view", module: "team", employeeDefault: true },
  { id: "team.viewAll", module: "team", employeeDefault: false },
  { id: "team.reassignManagers", module: "team", employeeDefault: false },
  { id: "team.assignWork", module: "team", employeeDefault: true },

  // Organic ads
  { id: "organicAds.viewOwn", module: "organicAds", employeeDefault: true },
  { id: "organicAds.viewTeam", module: "organicAds", employeeDefault: false },
  { id: "organicAds.viewAll", module: "organicAds", employeeDefault: false },
  { id: "organicAds.create", module: "organicAds", employeeDefault: true },
  { id: "organicAds.editOwn", module: "organicAds", employeeDefault: true },
  { id: "organicAds.editTeam", module: "organicAds", employeeDefault: false },
  { id: "organicAds.deleteOwn", module: "organicAds", employeeDefault: true },
  { id: "organicAds.deleteTeam", module: "organicAds", employeeDefault: false },
  { id: "organicAds.viewPerformance", module: "organicAds", employeeDefault: false },
  { id: "organicAds.viewValidation", module: "organicAds", employeeDefault: true },
  { id: "organicAds.overrideDuplicate", module: "organicAds", employeeDefault: false },
  { id: "organicAds.manageSettings", module: "organicAds", employeeDefault: false },
  { id: "organicAds.viewAudit", module: "organicAds", employeeDefault: false },

  // CRM
  { id: "crm.viewLeads", module: "crm", employeeDefault: true },
  { id: "crm.viewTeamLeads", module: "crm", employeeDefault: false },
  { id: "crm.viewOthersLeads", module: "crm", employeeDefault: false },
  { id: "crm.createLeads", module: "crm", employeeDefault: true },
  { id: "crm.editLeads", module: "crm", employeeDefault: true },
  { id: "crm.deleteLeads", module: "crm", employeeDefault: false },
  { id: "crm.assignLeads", module: "crm", employeeDefault: false },
  { id: "crm.bulkEditLeads", module: "crm", employeeDefault: false },
  { id: "crm.importLeads", module: "crm", employeeDefault: false },
  { id: "crm.exportLeads", module: "crm", employeeDefault: false },
  { id: "crm.manageStages", module: "crm", employeeDefault: false },
  { id: "crm.manageFeedbackTypes", module: "crm", employeeDefault: false },
  { id: "crm.manageBusinessTypes", module: "crm", employeeDefault: false },
  { id: "crm.viewDashboard", module: "crm", employeeDefault: true },
  { id: "crm.viewReports", module: "crm", employeeDefault: false },
  { id: "crm.viewPerformance", module: "crm", employeeDefault: false },
  { id: "crm.viewAudit", module: "crm", employeeDefault: false },
  { id: "crm.logActivities", module: "crm", employeeDefault: true },
  { id: "crm.addFeedback", module: "crm", employeeDefault: true },

  // Employees
  { id: "employees.view", module: "employees", employeeDefault: false },
  { id: "employees.viewTeam", module: "employees", employeeDefault: false },
  { id: "employees.create", module: "employees", employeeDefault: false },
  { id: "employees.edit", module: "employees", employeeDefault: false },
  { id: "employees.editTeam", module: "employees", employeeDefault: false },
  { id: "employees.delete", module: "employees", employeeDefault: false },
  { id: "employees.changeStatus", module: "employees", employeeDefault: false },
  { id: "employees.resetPassword", module: "employees", employeeDefault: false },

  // Schedule
  { id: "schedule.view", module: "schedule", employeeDefault: true },
  { id: "schedule.editPolicies", module: "schedule", employeeDefault: false },
  { id: "schedule.manageHolidays", module: "schedule", employeeDefault: false },
  { id: "schedule.manageShifts", module: "schedule", employeeDefault: false },

  // Leave
  { id: "leave.viewOwn", module: "leave", employeeDefault: true },
  { id: "leave.viewTeam", module: "leave", employeeDefault: false },
  { id: "leave.viewAll", module: "leave", employeeDefault: false },
  { id: "leave.request", module: "leave", employeeDefault: true },
  { id: "leave.approve", module: "leave", employeeDefault: false },
  { id: "leave.approveTeam", module: "leave", employeeDefault: false },
  { id: "leave.reject", module: "leave", employeeDefault: false },
  { id: "leave.rejectTeam", module: "leave", employeeDefault: false },
  { id: "leave.delete", module: "leave", employeeDefault: false },

  // Payroll
  { id: "payroll.viewOwnPayslip", module: "payroll", employeeDefault: true },
  { id: "payroll.viewTeamPayslips", module: "payroll", employeeDefault: false },
  { id: "payroll.viewAllPayslips", module: "payroll", employeeDefault: false },
  { id: "payroll.viewDashboard", module: "payroll", employeeDefault: false },
  { id: "payroll.editSalaryProfiles", module: "payroll", employeeDefault: false },
  { id: "payroll.editPolicies", module: "payroll", employeeDefault: false },
  { id: "payroll.runPayroll", module: "payroll", employeeDefault: false },
  { id: "payroll.viewReports", module: "payroll", employeeDefault: false },

  // Reports
  { id: "reports.viewWeekly", module: "reports", employeeDefault: false },
  { id: "reports.viewMonthly", module: "reports", employeeDefault: false },
  { id: "reports.export", module: "reports", employeeDefault: false },

  // Settings
  { id: "settings.viewCompany", module: "settings", employeeDefault: false },
  { id: "settings.editCompanyProfile", module: "settings", employeeDefault: false },
  { id: "settings.manageOrganization", module: "settings", employeeDefault: false },
  { id: "settings.manageNotifications", module: "settings", employeeDefault: false },
  { id: "settings.manageApprovals", module: "settings", employeeDefault: false },
  { id: "settings.managePermissions", module: "settings", employeeDefault: false },
  { id: "settings.impersonateUsers", module: "settings", employeeDefault: false },
  { id: "settings.manageDemoData", module: "settings", employeeDefault: false },
  { id: "settings.viewEmployeePreferences", module: "settings", employeeDefault: false },

  // Notifications
  { id: "notifications.viewOwn", module: "notifications", employeeDefault: true },
  { id: "notifications.sendCompany", module: "notifications", employeeDefault: false },
] as const satisfies readonly PermissionDefinition[];

export type PermissionId = (typeof PERMISSION_CATALOG)[number]["id"];

export type PermissionOverride = {
  permissionId: PermissionId;
  granted: boolean;
};

export const ALL_PERMISSION_IDS: PermissionId[] = PERMISSION_CATALOG.map(
  (item) => item.id
);

const PERMISSION_ID_SET = new Set<string>(ALL_PERMISSION_IDS);

export function isPermissionId(value: string): value is PermissionId {
  return PERMISSION_ID_SET.has(value);
}

export const EMPLOYEE_DEFAULT_PERMISSION_IDS: PermissionId[] =
  PERMISSION_CATALOG.filter((item) => item.employeeDefault).map(
    (item) => item.id
  );

export function permissionsForRole(role: UserRole | string): PermissionId[] {
  if (role === AppRole.admin) return [...ALL_PERMISSION_IDS];
  return [...EMPLOYEE_DEFAULT_PERMISSION_IDS];
}

export function resolveEffectivePermissions(
  role: UserRole | string,
  overrides: Array<{ permissionId: string; granted: boolean }>,
  opts?: { protectedAdmin?: boolean }
): PermissionId[] {
  if (opts?.protectedAdmin) return [...ALL_PERMISSION_IDS];
  const granted = new Set<PermissionId>(permissionsForRole(role));
  for (const override of overrides) {
    if (!isPermissionId(override.permissionId)) continue;
    if (override.granted) granted.add(override.permissionId);
    else granted.delete(override.permissionId);
  }
  return ALL_PERMISSION_IDS.filter((id) => granted.has(id));
}

export function overridesFromEffective(
  role: UserRole | string,
  effective: Iterable<string>
): PermissionOverride[] {
  const defaults = new Set(permissionsForRole(role));
  const next = new Set(
    [...effective].filter(isPermissionId)
  );
  const diffs: PermissionOverride[] = [];
  for (const id of ALL_PERMISSION_IDS) {
    const shouldGrant = next.has(id);
    const defaultGrant = defaults.has(id);
    if (shouldGrant !== defaultGrant) {
      diffs.push({ permissionId: id, granted: shouldGrant });
    }
  }
  return diffs;
}

export function hasPermissionId(
  id: PermissionId,
  permissions: readonly string[] | null | undefined,
  role?: UserRole | string
): boolean {
  if (permissions) return permissions.includes(id);
  if (role) return permissionsForRole(role).includes(id);
  return false;
}

export function hasAnyPermissionId(
  ids: readonly PermissionId[],
  permissions: readonly string[] | null | undefined,
  role?: UserRole | string
): boolean {
  return ids.some((id) => hasPermissionId(id, permissions, role));
}

/**
 * Whether the actor may see other people's records in a module.
 * The module switch is authoritative: granting `crm.viewOthersLeads`
 * (or `*.viewAll` / `*.viewTeam`) takes effect in that module immediately.
 */
export type DataAccessScope = "all" | "team" | "own";

export function resolveDataAccessScope(
  permissions: readonly string[] | null | undefined,
  moduleViewAll?: PermissionId,
  moduleViewTeam?: PermissionId,
  role?: UserRole | string
): DataAccessScope {
  if (moduleViewAll && hasPermissionId(moduleViewAll, permissions, role)) {
    return "all";
  }
  if (moduleViewTeam && hasPermissionId(moduleViewTeam, permissions, role)) {
    return "team";
  }
  return "own";
}

export function canViewOthersInModule(
  permissions: readonly string[] | null | undefined,
  moduleViewAll?: PermissionId,
  moduleViewTeam?: PermissionId,
  role?: UserRole | string
): { all: boolean; team: boolean } {
  const scope = resolveDataAccessScope(
    permissions,
    moduleViewAll,
    moduleViewTeam,
    role
  );
  return { all: scope === "all", team: scope === "all" || scope === "team" };
}

const OTHER_USERS_ACTION = new Set([
  "viewOtherUsers",
  "viewOtherProfiles",
  "viewAll",
  "viewTeam",
  "viewOthersLeads",
  "viewTeamLeads",
  "viewAllPayslips",
  "viewTeamPayslips",
  "viewCompanyStats",
  "viewTeamStats",
  "editTeam",
  "deleteTeam",
  "editTeamRecords",
  "approveTeam",
  "rejectTeam",
]);

/** Catalog rows that expose another user's operational records. */
export const OTHER_USERS_DATA_PERMISSION_IDS: PermissionId[] =
  PERMISSION_CATALOG.filter((item) => {
    const action = item.id.split(".")[1];
    return Boolean(action && OTHER_USERS_ACTION.has(action));
  }).map((item) => item.id);

function impliedOwnViewFor(id: PermissionId): PermissionId | undefined {
  const [module, action] = id.split(".");
  if (!module || !action) return undefined;
  const candidates: string[] = [];
  if (action === "viewOthersLeads" || action === "viewTeamLeads") {
    candidates.push(`${module}.viewLeads`);
  }
  if (action === "viewAllPayslips" || action === "viewTeamPayslips") {
    candidates.push(`${module}.viewOwnPayslip`);
  }
  if (action === "viewAll" || action === "viewTeam") {
    candidates.push(`${module}.viewOwn`);
    if (module === "employees") candidates.push(`${module}.view`);
  }
  if (action === "editTeam") candidates.push(`${module}.editOwn`);
  if (action === "deleteTeam") candidates.push(`${module}.deleteOwn`);
  if (action === "approveTeam") candidates.push(`${module}.viewTeam`);
  if (action === "rejectTeam") candidates.push(`${module}.viewTeam`);
  if (action === "editTeamRecords") candidates.push(`${module}.viewTeam`);
  return candidates.find(isPermissionId);
}

/** Keep related view/scope switches on so a grant actually unlocks the feature. */
export function withPermissionGrantSideEffects(
  current: Iterable<string>,
  id: PermissionId,
  granted: boolean
): Set<PermissionId> {
  const next = new Set<PermissionId>([...current].filter(isPermissionId));
  if (!granted) {
    next.delete(id);
    return next;
  }
  next.add(id);
  const own = impliedOwnViewFor(id);
  if (own) next.add(own);
  if (id !== "dataAccess.viewOtherUsers" && OTHER_USERS_DATA_PERMISSION_IDS.includes(id)) {
    next.add("dataAccess.viewOtherUsers");
  }
  return next;
}

export const CRM_CAPABILITY_TO_PERMISSION = {
  view: "crm.viewLeads",
  create: "crm.createLeads",
  edit: "crm.editLeads",
  delete: "crm.deleteLeads",
  assign: "crm.assignLeads",
  manage_stages: "crm.manageStages",
  manage_feedback_types: "crm.manageFeedbackTypes",
  manage_business_types: "crm.manageBusinessTypes",
  view_dashboard: "crm.viewDashboard",
  view_reports: "crm.viewReports",
  view_performance: "crm.viewPerformance",
  view_audit: "crm.viewAudit",
  export: "crm.exportLeads",
} as const satisfies Record<string, PermissionId>;

export const TARGET_CAPABILITY_TO_PERMISSION = {
  view: "targets.viewOwn",
  create: "targets.create",
  edit: "targets.edit",
  delete: "targets.delete",
  assign: "targets.assign",
  manage_categories: "targets.manageCategories",
  manage_types: "targets.manageTypes",
  manage_templates: "targets.manageTemplates",
  view_dashboard: "targets.viewDashboard",
  view_reports: "targets.viewReports",
  send_warnings: "targets.sendWarnings",
  manage_penalties: "targets.managePenalties",
  view_delayed: "targets.viewDelayed",
  export: "targets.export",
} as const satisfies Record<string, PermissionId>;

export const ORGANIC_ADS_CAPABILITY_TO_PERMISSION = {
  view_own: "organicAds.viewOwn",
  view_team: "organicAds.viewTeam",
  create: "organicAds.create",
  edit_own: "organicAds.editOwn",
  edit_team: "organicAds.editTeam",
  delete_own: "organicAds.deleteOwn",
  delete_team: "organicAds.deleteTeam",
  view_performance: "organicAds.viewPerformance",
  view_validation: "organicAds.viewValidation",
  override_duplicate: "organicAds.overrideDuplicate",
  manage_settings: "organicAds.manageSettings",
  view_audit: "organicAds.viewAudit",
} as const satisfies Record<string, PermissionId>;

export const ROUTE_PERMISSIONS: Array<{
  prefix: string;
  anyOf: PermissionId[];
}> = [
  { prefix: "/employees", anyOf: ["employees.view", "employees.viewTeam"] },
  { prefix: "/reports", anyOf: ["reports.viewWeekly", "reports.viewMonthly"] },
  { prefix: "/dashboard", anyOf: ["dashboard.view"] },
  {
    prefix: "/attendance",
    anyOf: [
      "attendance.viewOwn",
      "attendance.viewTeam",
      "attendance.viewAll",
    ],
  },
  {
    prefix: "/daily-plan",
    anyOf: [
      "dailyPlan.viewOwn",
      "dailyPlan.viewTeam",
      "dailyPlan.viewAll",
    ],
  },
  {
    prefix: "/tasks",
    anyOf: ["tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll"],
  },
  { prefix: "/work", anyOf: ["tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll"] },
  {
    prefix: "/targets",
    anyOf: ["targets.viewOwn", "targets.viewTeam", "targets.viewAll"],
  },
  { prefix: "/team", anyOf: ["team.view", "team.viewAll"] },
  {
    prefix: "/organic-ads",
    anyOf: [
      "organicAds.viewOwn",
      "organicAds.viewTeam",
      "organicAds.viewAll",
    ],
  },
  { prefix: "/crm", anyOf: ["crm.viewLeads", "crm.viewTeamLeads", "crm.viewOthersLeads"] },
  { prefix: "/schedule", anyOf: ["schedule.view"] },
  {
    prefix: "/leave",
    anyOf: ["leave.viewOwn", "leave.viewTeam", "leave.viewAll"],
  },
  {
    prefix: "/payroll",
    anyOf: [
      "payroll.viewOwnPayslip",
      "payroll.viewTeamPayslips",
      "payroll.viewAllPayslips",
      "payroll.viewDashboard",
    ],
  },
  { prefix: "/permissions", anyOf: ["settings.managePermissions"] },
];

export const COMPANY_ADMIN_PERMISSIONS: PermissionId[] = [
  "settings.viewCompany",
  "settings.editCompanyProfile",
  "settings.manageOrganization",
  "settings.manageNotifications",
  "settings.manageApprovals",
  "settings.manageDemoData",
  "settings.viewEmployeePreferences",
  "schedule.editPolicies",
  "schedule.manageShifts",
  "schedule.manageHolidays",
];

export const ADMIN_SECTION_PERMISSION: Record<string, PermissionId | null> = {
  profile: "settings.editCompanyProfile",
  policies: "schedule.editPolicies",
  shifts: "schedule.manageShifts",
  wfh: "schedule.editPolicies",
  departments: "settings.manageOrganization",
  positions: "settings.manageOrganization",
  locations: "settings.manageOrganization",
  calendar: "schedule.manageHolidays",
  notifications: "settings.manageNotifications",
  approvals: "settings.manageApprovals",
  accounts: "employees.view",
  employeePrefs: "settings.viewEmployeePreferences",
  myPrefs: null,
  appearance: "settings.editCompanyProfile",
  demo: "settings.manageDemoData",
};
