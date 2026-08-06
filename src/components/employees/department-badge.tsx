"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { departmentLabel } from "@/lib/department-label";
import { cn } from "@/lib/utils";

const KNOWN_TONE: Record<string, string> = {
  Engineering: "border-primary/20 bg-primary/[0.07] text-primary",
  Design: "border-sky-500/20 bg-sky-500/[0.08] text-sky-800 dark:text-sky-300",
  Product: "border-teal-500/20 bg-teal-500/[0.08] text-teal-800 dark:text-teal-300",
  HR: "border-amber-500/20 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
  Finance: "border-slate-500/20 bg-slate-500/[0.08] text-slate-700 dark:text-slate-300",
  Marketing: "border-rose-500/20 bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
  Operations:
    "border-orange-500/20 bg-orange-500/[0.08] text-orange-800 dark:text-orange-300",
  Sales:
    "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300",
};

const FALLBACK_TONE = "border-border/70 bg-muted/40 text-foreground";

export { departmentLabel };

export function DepartmentBadge({
  department,
  className,
  nameAr,
}: {
  department: string;
  className?: string;
  /** Optional Arabic label from org catalog. */
  nameAr?: string;
}) {
  const { t, locale } = useTranslation();
  const label =
    locale === "ar" && nameAr?.trim()
      ? nameAr.trim()
      : departmentLabel(department, t);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        KNOWN_TONE[department] ?? FALLBACK_TONE,
        className
      )}
    >
      {label}
    </Badge>
  );
}
