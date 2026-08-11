"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { UserRound, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getInitials } from "@/lib/utils";
import type { Employee } from "@/types";

export function ManagerCard({
  manager,
  managers,
}: {
  manager?: Employee | null;
  managers?: Employee[];
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const list = managers ?? (manager ? [manager] : []);

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="manager-card-heading"
    >
      <div className="panel-header">
        <h3
          id="manager-card-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
        >
          <UserRound className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("employeeHome.managerCard")}
        </h3>
      </div>
      <div className="panel-body space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("employees.noManager")}
          </p>
        ) : (
          list.map((person) => (
            <div key={person.id} className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                {person.avatar ? (
                  <AvatarImage src={person.avatar} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary/[0.08] font-semibold text-primary">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.position}
                </p>
                <div className="mt-1.5">
                  <DepartmentBadge department={person.department} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.section>
  );
}

export function MyTeamCard({ teammates }: { teammates: Employee[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="my-team-heading"
    >
      <div className="panel-header flex items-center justify-between gap-2">
        <h3
          id="my-team-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
        >
          <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("employeeHome.myTeam")}
        </h3>
        <Link
          href="/employees"
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("dashboard.open")}
        </Link>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-2"
      >
        {teammates.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            {t("employeeHome.noTeammates")}
          </li>
        ) : (
          teammates.slice(0, 5).map((member) => (
            <motion.li
              key={member.id}
              variants={fadeInUp}
              className="flex items-center gap-3 rounded-xl border border-border/60 px-2.5 py-2"
            >
              <Avatar className="h-8 w-8 border border-border">
                {member.avatar ? (
                  <AvatarImage src={member.avatar} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary/[0.08] text-[10px] font-semibold text-primary">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{member.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {member.position}
                </p>
              </div>
            </motion.li>
          ))
        )}
      </motion.ul>
    </motion.section>
  );
}
