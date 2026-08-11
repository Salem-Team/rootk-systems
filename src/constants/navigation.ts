import {
  ROUTE_PERMISSIONS,
  hasAnyPermissionId,
  type PermissionId,
} from "@/constants/permissions";
import { AppRole } from "@/constants/roles";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Clock,
  Users,
  UsersRound,
  CalendarClock,
  CalendarDays,
  FileText,
  BarChart3,
  Settings,
  Target,
  Wallet,
  ListTodo,
  Megaphone,
  ContactRound,
  type LucideIcon,
} from "lucide-react";

export type NavKey =
  | "dashboard"
  | "attendance"
  | "employees"
  | "schedule"
  | "leave"
  | "reports"
  | "payroll"
  | "settings"
  | "home"
  | "people"
  | "more"
  | "tasks"
  | "targets"
  | "organicAds"
  | "crm"
  | "team"
  | "dailyPlan";

export interface AppNavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  anyOf?: PermissionId[];
  /** When true, sidebar may show a live count badge (e.g. pending leave). */
  badge?: boolean;
}

export const APP_NAV: AppNavItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["dashboard.view"],
  },
  {
    key: "attendance",
    href: "/attendance",
    icon: Clock,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["attendance.viewOwn", "attendance.viewTeam", "attendance.viewAll"],
  },
  {
    key: "dailyPlan",
    href: "/daily-plan",
    icon: CalendarClock,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["dailyPlan.viewOwn", "dailyPlan.viewTeam", "dailyPlan.viewAll"],
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: ListTodo,
    roles: [AppRole.admin, AppRole.employee],
    badge: true,
    anyOf: ["tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll"],
  },
  {
    key: "targets",
    href: "/targets",
    icon: Target,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["targets.viewOwn", "targets.viewTeam", "targets.viewAll"],
  },
  {
    key: "team",
    href: "/team",
    icon: UsersRound,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["team.view", "team.viewAll"],
  },
  {
    key: "organicAds",
    href: "/organic-ads",
    icon: Megaphone,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: [
      "organicAds.viewOwn",
      "organicAds.viewTeam",
      "organicAds.viewAll",
    ],
  },
  {
    key: "crm",
    href: "/crm",
    icon: ContactRound,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["crm.viewLeads"],
  },
  {
    key: "employees",
    href: "/employees",
    icon: Users,
    roles: [AppRole.admin],
    anyOf: ["employees.view"],
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: CalendarDays,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["schedule.view"],
  },
  {
    key: "leave",
    href: "/leave",
    icon: FileText,
    roles: [AppRole.admin, AppRole.employee],
    badge: true,
    anyOf: ["leave.viewOwn", "leave.viewTeam", "leave.viewAll"],
  },
  {
    key: "reports",
    href: "/reports",
    icon: BarChart3,
    roles: [AppRole.admin],
    anyOf: ["reports.viewWeekly", "reports.viewMonthly"],
  },
  {
    key: "payroll",
    href: "/payroll",
    icon: Wallet,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: [
      "payroll.viewOwnPayslip",
      "payroll.viewAllPayslips",
      "payroll.viewDashboard",
    ],
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    roles: [AppRole.admin, AppRole.employee],
  },
];

export const MOBILE_NAV: AppNavItem[] = [
  {
    key: "home",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["dashboard.view"],
  },
  {
    key: "attendance",
    href: "/attendance",
    icon: Clock,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["attendance.viewOwn", "attendance.viewTeam", "attendance.viewAll"],
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: ListTodo,
    roles: [AppRole.admin, AppRole.employee],
    anyOf: ["tasks.viewOwn", "tasks.viewTeam", "tasks.viewAll"],
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: CalendarDays,
    roles: [AppRole.admin],
    anyOf: ["schedule.view"],
  },
  {
    key: "more",
    href: "/settings",
    icon: Settings,
    roles: [AppRole.admin, AppRole.employee],
  },
];

export const ADMIN_ONLY_ROUTES = [
  "/employees",
  "/reports",
];

/** Surfaces that admins fully own; employees keep shared pages with scoped UI. */
export const ADMIN_CONTROL_SURFACES = [
  "/employees",
  "/reports",
  "/settings",
] as const;

export function navForRole(
  role: UserRole,
  items: AppNavItem[] = APP_NAV,
  permissions?: readonly PermissionId[]
) {
  return items.filter((item) => {
    if (item.anyOf?.length) {
      return hasAnyPermissionId(item.anyOf, permissions, role);
    }
    return item.roles.includes(role);
  });
}

export function canAccessRoute(
  role: UserRole,
  pathname: string,
  permissions?: readonly PermissionId[]
): boolean {
  const rule = ROUTE_PERMISSIONS.find((item) => pathname.startsWith(item.prefix));
  if (rule) {
    return hasAnyPermissionId(rule.anyOf, permissions, role);
  }
  return true;
}

/** True when the signed-in admin should see every company control surface. */
export function isAdminFullAccess(role: UserRole): boolean {
  return role === AppRole.admin;
}
