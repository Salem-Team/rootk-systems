"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getInitials } from "@/lib/utils";
import type { Employee } from "@/types";

function OrgPersonCard({
  employee,
  roleLabel,
  onSelect,
}: {
  employee: Employee;
  roleLabel?: string;
  onSelect?: (employee: Employee) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(employee)}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-start transition-all duration-200 hover:border-primary/25 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar className="h-9 w-9 border border-border transition-transform duration-200 group-hover:scale-[1.04]">
        {employee.avatar ? <AvatarImage src={employee.avatar} alt="" /> : null}
        <AvatarFallback className="bg-primary/[0.08] text-[11px] font-semibold text-primary">
          {getInitials(employee.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold tracking-tight">
          {employee.name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {roleLabel ?? employee.position}
        </p>
      </div>
      <DepartmentBadge department={employee.department} className="hidden sm:inline-flex" />
    </button>
  );
}

export function EmployeeOrgPanel({
  manager,
  directReports,
  departmentPeers,
  onSelect,
}: {
  manager: Employee | null;
  directReports: Employee[];
  departmentPeers: Employee[];
  onSelect?: (employee: Employee) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-5"
    >
      <motion.section variants={fadeInUp} className="space-y-2">
        <p className="section-label">{t("employees.manager")}</p>
        {manager ? (
          <OrgPersonCard
            employee={manager}
            roleLabel={manager.position}
            onSelect={onSelect}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            {t("employees.noManager")}
          </div>
        )}
      </motion.section>

      <motion.section variants={fadeInUp} className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="section-label !mb-0">
            {t("employees.directTeam")} ({directReports.length})
          </p>
        </div>
        {directReports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            {t("employees.noDirectReports")}
          </div>
        ) : (
          <div className="space-y-2">
            {directReports.map((e) => (
              <OrgPersonCard key={e.id} employee={e} onSelect={onSelect} />
            ))}
          </div>
        )}
      </motion.section>

      <motion.section variants={fadeInUp} className="space-y-2">
        <p className="section-label">
          {t("employees.departmentMembers")} ({departmentPeers.length})
        </p>
        {departmentPeers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            {t("employees.noDepartmentPeers")}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {departmentPeers.slice(0, 8).map((e) => (
              <OrgPersonCard key={e.id} employee={e} onSelect={onSelect} />
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
