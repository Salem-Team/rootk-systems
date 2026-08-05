import type { Department, LeaveType } from "@/types";

export const APP_NAME = "ROOTK Internal HR System";
export const APP_SHORT = "ROOTK";
export const LOGO_SRC = "/rootk-logo.png";
/** Exact navy sampled from the ROOTK logo mark */
export const BRAND_NAVY = "#082868";

export const DEPARTMENTS: Department[] = [
  "Engineering",
  "Design",
  "Product",
  "HR",
  "Finance",
  "Marketing",
  "Operations",
  "Sales",
];

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "personal", label: "Personal Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "emergency", label: "Emergency Leave" },
];

/** Semantic status tokens — solid fills, WCAG-friendly contrast on light & dark UI */
export const STATUS_COLORS = {
  present:
    "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
  absent:
    "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100",
  late:
    "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100",
  wfh:
    "border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100",
  early_leave:
    "border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100",
  half_day:
    "border-teal-300 bg-teal-100 text-teal-950 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100",
  on_leave:
    "border-slate-300 bg-slate-100 text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
  pending:
    "border-dashed border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100",
  approved:
    "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
  rejected:
    "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100",
  active:
    "border-primary/30 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-primary",
  inactive:
    "border-border bg-muted text-foreground/80 dark:border-border dark:bg-secondary dark:text-secondary-foreground",
} as const;

/** High-contrast chips for dark/navy surfaces (heroes, sidebars) */
export const STATUS_COLORS_ON_DARK = {
  present: "border-emerald-200/80 bg-emerald-200 text-emerald-950",
  absent: "border-rose-200/80 bg-rose-200 text-rose-950",
  late: "border-amber-200/80 bg-amber-200 text-amber-950",
  wfh: "border-sky-200/80 bg-sky-200 text-sky-950",
  early_leave: "border-orange-200/80 bg-orange-200 text-orange-950",
  half_day: "border-teal-200/80 bg-teal-200 text-teal-950",
  on_leave: "border-slate-200/80 bg-slate-200 text-slate-950",
  pending: "border-amber-200/80 bg-amber-200 text-amber-950",
  approved: "border-emerald-200/80 bg-emerald-200 text-emerald-950",
  rejected: "border-rose-200/80 bg-rose-200 text-rose-950",
  active: "border-white/40 bg-white text-primary",
  inactive: "border-white/30 bg-white/90 text-slate-900",
} as const;
