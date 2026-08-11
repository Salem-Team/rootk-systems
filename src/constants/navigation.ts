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
  /** When true, sidebar may show a live count badge (e.g. pending leave). */
  badge?: boolean;
}

export const APP_NAV: AppNavItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "attendance",
    href: "/attendance",
    icon: Clock,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "dailyPlan",
    href: "/daily-plan",
    icon: CalendarClock,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: ListTodo,
    roles: [AppRole.admin, AppRole.employee],
    badge: true,
  },
  {
    key: "targets",
    href: "/targets",
    icon: Target,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "team",
    href: "/team",
    icon: UsersRound,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "organicAds",
    href: "/organic-ads",
    icon: Megaphone,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "crm",
    href: "/crm",
    icon: ContactRound,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "employees",
    href: "/employees",
    icon: Users,
    roles: [AppRole.admin],
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: CalendarDays,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "leave",
    href: "/leave",
    icon: FileText,
    roles: [AppRole.admin, AppRole.employee],
    badge: true,
  },
  {
    key: "reports",
    href: "/reports",
    icon: BarChart3,
    roles: [AppRole.admin],
  },
  {
    key: "payroll",
    href: "/payroll",
    icon: Wallet,
    roles: [AppRole.admin, AppRole.employee],
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
  },
  {
    key: "attendance",
    href: "/attendance",
    icon: Clock,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: ListTodo,
    roles: [AppRole.admin, AppRole.employee],
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: CalendarDays,
    roles: [AppRole.admin],
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

export function navForRole(role: UserRole, items: AppNavItem[] = APP_NAV) {
  return items.filter((item) => item.roles.includes(role));
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    return role === AppRole.admin;
  }
  return true;
}

/** True when the signed-in admin should see every company control surface. */
export function isAdminFullAccess(role: UserRole): boolean {
  return role === AppRole.admin;
}
