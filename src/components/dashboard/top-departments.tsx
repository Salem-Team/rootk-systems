"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { DepartmentStat } from "@/components/dashboard/dashboard-mock-data";

export function TopDepartments({ stats }: { stats: DepartmentStat[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const top = stats.slice(0, 5);

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="top-depts-heading"
    >
      <div className="panel-header">
        <h3
          id="top-depts-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
        >
          <Award className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("dashboard.topDepartments")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("dashboard.topDepartmentsDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-3"
      >
        {top.map((row, index) => (
          <motion.li key={row.department} variants={fadeInUp} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-semibold tabular-nums">
                  {index + 1}
                </span>
                <DepartmentBadge department={row.department} />
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {row.rate}%
              </span>
            </div>
            <Progress value={row.rate} className="h-1.5" />
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
