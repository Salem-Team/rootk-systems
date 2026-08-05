"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { getEmployees } from "@/services/employees.service";
import { DEPARTMENTS } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Department, Employee } from "@/types";

const COLORS: Record<Department, string> = {
  Engineering: "bg-primary",
  Design: "bg-sky-500",
  Product: "bg-teal-500",
  HR: "bg-amber-500",
  Finance: "bg-slate-500",
  Marketing: "bg-rose-500",
  Operations: "bg-orange-500",
  Sales: "bg-emerald-500",
};

export function DepartmentsAdminPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void getEmployees().then((res) => {
      if (!mounted) return;
      if (res.success) setEmployees(res.data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    return DEPARTMENTS.map((department) => {
      const members = employees.filter((e) => e.department === department);
      const active = members.filter((e) => e.status !== "inactive").length;
      const managers = members
        .map((e) => e.manager)
        .filter(Boolean) as string[];
      const manager =
        managers.sort(
          (a, b) =>
            managers.filter((m) => m === b).length -
            managers.filter((m) => m === a).length
        )[0] ?? "—";
      const presentRate =
        members.length === 0
          ? 0
          : Math.round((active / members.length) * 100);
      return {
        department,
        employees: members.length,
        active: members.length > 0,
        manager,
        presentRate,
        color: COLORS[department],
      };
    }).filter((r) => r.employees > 0 || true);
  }, [employees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-3"
      aria-labelledby="depts-admin-heading"
    >
      <div>
        <h3
          id="depts-admin-heading"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <Users className="h-4 w-4 text-primary" aria-hidden />
          {t("admin.departmentsTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("admin.departmentsLiveDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {rows.map((dept) => (
          <motion.li
            key={dept.department}
            variants={fadeInUp}
            className="surface-panel surface-panel-interactive p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", dept.color)}
                  aria-hidden
                />
                <DepartmentBadge department={dept.department} />
              </div>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                  dept.active
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {dept.active ? t("status.active") : t("status.inactive")}
              </span>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {t("employees.manager")}:{" "}
              <span className="font-medium text-foreground">{dept.manager}</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
                <p className="text-muted-foreground">{t("admin.employeeCount")}</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums">
                  {dept.employees}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
                <p className="text-muted-foreground">{t("status.active")}</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums">
                  {dept.presentRate}%
                </p>
              </div>
            </div>
            <Progress value={dept.presentRate} className="mt-3 h-1.5" />
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
