"use client";

import { CalendarDays, MapPin, MessageSquare, Pencil, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { EmployeePerformanceButton } from "@/components/employees/employee-performance-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/hooks/use-translation";
import { getInitials } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  EmploymentType,
  WorkMode,
} from "@/components/employees/profile-data";

export function EmployeeProfileHeader({
  employee,
  employmentType,
  workMode,
  onEdit,
}: {
  employee: Employee;
  employmentType: EmploymentType;
  workMode: WorkMode;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 border-b border-border pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-20 w-20 border border-border shadow-sm ring-4 ring-background">
          {employee.avatar ? (
            <AvatarImage src={employee.avatar} alt={employee.name} />
          ) : null}
          <AvatarFallback className="bg-primary/[0.08] text-xl font-semibold text-primary">
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {employee.employeeId}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              {employee.name}
            </h2>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <DepartmentBadge department={employee.department} />
            <StatusBadge status={employee.status} />
            <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {t(`employees.employment.${employmentType}`)}
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {t(`employees.workMode.${workMode}`)}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {employee.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {t("employees.hiredOn", { date: employee.joinDate })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled>
          <MessageSquare className="h-3.5 w-3.5" />
          {t("employees.actionMessage")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled>
          <Phone className="h-3.5 w-3.5" />
          {t("employees.actionCall")}
        </Button>
        <EmployeePerformanceButton
          employee={employee}
          size="sm"
          variant="outline"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!onEdit}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          {t("employees.actionEdit")}
        </Button>
      </div>
    </div>
  );
}
