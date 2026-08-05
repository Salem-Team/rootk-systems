import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Clock,
  Users,
  CalendarDays,
  FileText,
  BarChart3,
  Settings,
  Wallet,
  ListTodo,
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
  | "tasks";

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
    roles: ["admin", "employee"],
  },
  {
    key: "attendance",
    href: "/attendance",
    icon: Clock,
    roles: ["admin", "employee"],
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: ListTodo,
    roles: ["admin", "employee"],
    badge: true,
  },
  {
    key: "employees",
    href: "/employees",
    icon: Users,
    roles: ["admin"],
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: CalendarDays,
    roles: ["admin", "employee"],
  },
  {
    key: "leave",
    href: "/leave",
    icon: FileText,
    roles: ["admin", "employee"],
    badge: true,
  },
  {
    key: "reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    key: "payroll",
    href: "/payroll",
    icon: Wallet,
    roles: ["admin", "employee"],
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin", "employee"],
  },
];

export const MOBILE_NAV: AppNavItem[] = [
  {
    key: "home",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "employee"],
  },
  {
    key: "attendance",
    href: "/attendance",
    icon: Clock,
    roles: ["admin", "employee"],
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: ListTodo,
    roles: ["admin", "employee"],
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: CalendarDays,
    roles: ["admin"],
  },
  {
    key: "more",
    href: "/settings",
    icon: Settings,
    roles: ["admin", "employee"],
  },
];

export const ADMIN_ONLY_ROUTES = ["/employees", "/reports"];

export function navForRole(role: UserRole, items: AppNavItem[] = APP_NAV) {
  return items.filter((item) => item.roles.includes(role));
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    return role === "admin";
  }
  return true;
}
