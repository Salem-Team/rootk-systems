"use client";

import { Users } from "lucide-react";
import { EmployeeCard } from "@/components/employees/employee-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StaggerItem, StaggerRoot } from "@/components/shared/stagger";
import { useTranslation } from "@/hooks/use-translation";
import type { AttendanceRecord, Employee } from "@/types";

interface EmployeeGridProps {
  employees: Employee[];
  attendanceByEmployee?: Record<string, AttendanceRecord>;
  onSelect?: (employee: Employee) => void;
}

export function EmployeeGrid({
  employees,
  attendanceByEmployee = {},
  onSelect,
}: EmployeeGridProps) {
  const { t } = useTranslation();

  if (employees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("employees.empty")}
        description={t("employees.emptyDesc")}
      />
    );
  }

  return (
    <StaggerRoot
      speed="base"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-label={t("employees.title")}
    >
      {employees.map((employee) => (
        <StaggerItem key={employee.id} preset="rise">
          <EmployeeCard
            employee={employee}
            attendance={attendanceByEmployee[employee.id] ?? null}
            onSelect={onSelect}
          />
        </StaggerItem>
      ))}
    </StaggerRoot>
  );
}
