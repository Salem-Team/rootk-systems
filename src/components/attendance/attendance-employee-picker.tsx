"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";

interface AttendanceEmployeePickerProps {
  employees: Employee[];
  value: string;
  onChange: (employeeId: string) => void;
  disabled?: boolean;
}

export function AttendanceEmployeePicker({
  employees,
  value,
  onChange,
  disabled = false,
}: AttendanceEmployeePickerProps) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-sm">
      <Label htmlFor="attendance-employee-picker">
        {t("attendance.selectEmployee")}
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || employees.length === 0}
      >
        <SelectTrigger
          id="attendance-employee-picker"
          aria-label={t("attendance.selectEmployee")}
        >
          <SelectValue placeholder={t("attendance.selectEmployeePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.name}
              {employee.employeeId ? ` · ${employee.employeeId}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {t("attendance.selectEmployeeDesc")}
      </p>
    </div>
  );
}
