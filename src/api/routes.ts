/**
 * Canonical NestJS REST routes expected by the frontend.
 * Keep in sync with Nest controllers under `/api` and with docs/BACKEND_INTEGRATION.md.
 *
 * Stack target: NestJS + Prisma + PostgreSQL
 */
export const API_ROUTES = {
  auth: {
    login: "/auth/login",
    changePassword: "/auth/change-password",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
    profile: "/auth/profile",
  },
  employees: {
    root: "/employees",
    byId: (id: string) => `/employees/${id}`,
    status: (id: string) => `/employees/${id}/status`,
    /** Aggregated attendance/leave/activity for profile drawers */
    profileExtras: (id: string) => `/employees/${id}/profile-extras`,
  },
  attendance: {
    root: "/attendance",
    meToday: "/attendance/me/today",
    checkIn: "/attendance/check-in",
    checkOut: "/attendance/check-out",
  },
  leave: {
    root: "/leave",
    byId: (id: string) => `/leave/${id}`,
    approve: (id: string) => `/leave/${id}/approve`,
    reject: (id: string) => `/leave/${id}/reject`,
  },
  schedule: {
    root: "/schedule",
    holidays: "/schedule/holidays",
    holidayById: (id: string) => `/schedule/holidays/${id}`,
  },
  dailyPlan: {
    root: "/daily-plan",
    report: "/daily-plan/report",
  },
  settings: {
    root: "/settings",
  },
  notifications: {
    root: "/notifications",
    byId: (id: string) => `/notifications/${id}`,
    read: (id: string) => `/notifications/${id}/read`,
    readAll: "/notifications/read-all",
  },
  users: {
    root: "/users",
    byId: (id: string) => `/users/${id}`,
    preferences: (id: string) => `/users/${id}/preferences`,
  },
  preferences: {
    /** Admin: all employee preference rows */
    employeeRows: "/preferences/employees",
    resetAllNotifications: "/preferences/employees/reset-notifications",
    resetEmployeeNotifications: (userId: string) =>
      `/preferences/employees/${userId}/reset-notifications`,
  },
  work: {
    tasks: "/work/tasks",
    taskById: (id: string) => `/work/tasks/${id}`,
    taskStatus: (id: string) => `/work/tasks/${id}/status`,
    taskSubItem: (id: string, subId: string) =>
      `/work/tasks/${id}/sub-items/${subId}`,
    meetings: "/work/meetings",
    meetingById: (id: string) => `/work/meetings/${id}`,
  },
  org: {
    locations: "/org/locations",
    locationById: (id: string) => `/org/locations/${id}`,
    resolveMapsUrl: "/org/locations/resolve-maps-url",
    positions: "/org/positions",
    positionById: (id: string) => `/org/positions/${id}`,
    departments: "/org/departments",
    departmentById: (id: string) => `/org/departments/${id}`,
    shifts: "/org/shifts",
    shiftById: (id: string) => `/org/shifts/${id}`,
    approvals: "/org/approvals",
    approvalById: (id: string) => `/org/approvals/${id}`,
  },
  payroll: {
    dashboard: "/payroll/dashboard",
    policies: "/payroll/policies",
    rules: "/payroll/rules",
    ruleToggle: (id: string) => `/payroll/rules/${id}/toggle`,
    runAdvance: "/payroll/runs/advance",
    runCancel: "/payroll/runs/cancel",
    reports: "/payroll/reports",
    payslips: "/payroll/payslips",
    payslipByEmployee: (employeeId: string) =>
      `/payroll/payslips/${employeeId}`,
    payslipHistory: (employeeId: string) =>
      `/payroll/payslips/${employeeId}/history`,
    salaryProfile: (employeeId: string) =>
      `/payroll/salary-profiles/${employeeId}`,
    salaryProfiles: "/payroll/salary-profiles",
    runs: "/payroll/runs",
  },
  dashboard: {
    stats: "/dashboard/stats",
    summary: "/dashboard/summary",
  },
  targets: {
    root: "/targets",
    byId: (id: string) => `/targets/${id}`,
    recalculate: (id: string) => `/targets/${id}/recalculate`,
    categories: "/targets/categories",
    categoryById: (id: string) => `/targets/categories/${id}`,
    types: "/targets/types",
    typeById: (id: string) => `/targets/types/${id}`,
    templates: "/targets/templates",
    templateById: (id: string) => `/targets/templates/${id}`,
    dashboard: "/targets/dashboard",
    delayed: "/targets/delayed",
    warnings: "/targets/warnings",
    warningAcknowledge: (id: string) => `/targets/warnings/${id}/acknowledge`,
    employeePerformance: (employeeId: string) =>
      `/targets/employees/${employeeId}/performance`,
  },
  crm: {
    stages: "/crm/stages",
    stageById: (id: string) => `/crm/stages/${id}`,
    stagesReorder: "/crm/stages/reorder",
    subStages: "/crm/sub-stages",
    subStageById: (id: string) => `/crm/sub-stages/${id}`,
    subStagesReorder: "/crm/sub-stages/reorder",
    feedbackTypes: "/crm/feedback-types",
    feedbackTypeById: (id: string) => `/crm/feedback-types/${id}`,
    businessTypes: "/crm/business-types",
    businessTypeById: (id: string) => `/crm/business-types/${id}`,
    leads: "/crm/leads",
    leadById: (id: string) => `/crm/leads/${id}`,
    leadsBulk: "/crm/leads/bulk",
    leadsImport: "/crm/leads/import",
    leadsExport: "/crm/leads/export",
    leadActivities: (id: string) => `/crm/leads/${id}/activities`,
    leadTimeline: (id: string) => `/crm/leads/${id}/timeline`,
    leadFeedback: (id: string) => `/crm/leads/${id}/feedback`,
    dashboard: "/crm/dashboard",
    performance: "/crm/performance",
    performanceByEmployee: (employeeId: string) =>
      `/crm/performance/${employeeId}`,
    activities: "/crm/activities",
    feedback: "/crm/feedback",
    reports: "/crm/reports",
  },
  /** Wired when Organic Ads Nest module ships. */
  organicAds: {
    root: "/organic-ads",
    byId: (id: string) => `/organic-ads/${id}`,
    overview: "/organic-ads/overview",
    inspect: "/organic-ads/inspect",
    performance: "/organic-ads/performance",
    profile: (employeeId: string) =>
      `/organic-ads/employees/${employeeId}/profile`,
    settings: "/organic-ads/settings",
    history: "/organic-ads/history",
    linkableTasks: "/organic-ads/linkable-tasks",
  },
  reports: {
    weekly: "/reports/weekly",
    monthly: "/reports/monthly",
  },
  activities: {
    root: "/activities",
  },
  announcements: {
    root: "/announcements",
  },
  demo: {
    reset: "/demo/reset",
    generate: "/demo/generate",
    clear: "/demo",
  },
  health: {
    live: "/health/live",
    ready: "/health/ready",
  },
} as const;

export function toQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
