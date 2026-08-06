"use client";

import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { EmployeePerformanceButton } from "@/components/employees/employee-performance-dialog";
import { MotionCard } from "@/components/shared/motion-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/hooks/use-translation";
import {
  locationKey,
  positionKey,
  translateOrFallback,
} from "@/lib/i18n-content";
import { getInitials } from "@/lib/utils";
import type { AttendanceRecord, Employee } from "@/types";

interface EmployeeCardProps {
  employee: Employee;
  attendance?: AttendanceRecord | null;
  onSelect?: (employee: Employee) => void;
}

export function EmployeeCard({
  employee,
  attendance,
  onSelect,
}: EmployeeCardProps) {
  const { t } = useTranslation();

  return (
    <MotionCard className="h-full">
      <Card
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={() => onSelect?.(employee)}
        onKeyDown={(e) => {
          if (!onSelect) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(employee);
          }
        }}
        className="group h-full cursor-pointer overflow-hidden border-border/70 transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border border-border transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transition-none">
              {employee.avatar ? (
                <AvatarImage src={employee.avatar} alt={employee.name} />
              ) : null}
              <AvatarFallback className="bg-primary/[0.08] text-sm font-semibold text-primary">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-semibold tracking-tight">
                    {employee.name}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {translateOrFallback(
                      t,
                      positionKey(employee.position),
                      employee.position
                    )}
                  </p>
                </div>
                <StatusBadge status={employee.status} className="shrink-0" />
              </div>
              <div className="mt-2.5">
                <DepartmentBadge department={employee.department} />
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden />
                {translateOrFallback(
                  t,
                  locationKey(employee.location),
                  employee.location
                )}
              </p>
            </div>
          </div>

          {attendance ? (
            <div className="mt-3.5 flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">
                {t("employees.currentAttendance")}
              </span>
              <StatusBadge status={attendance.status} />
            </div>
          ) : (
            <div className="mt-3.5 flex items-center justify-between rounded-lg border border-dashed border-border/70 px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">
                {t("employees.currentAttendance")}
              </span>
              <span className="text-[11px] text-muted-foreground">—</span>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <EmployeePerformanceButton
              employee={employee}
              size="sm"
              variant="secondary"
            />
          </div>
        </CardContent>
      </Card>
    </MotionCard>
  );
}
