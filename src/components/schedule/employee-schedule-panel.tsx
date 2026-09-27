"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ScheduleForm } from "@/components/schedule/schedule-form";
import { SectionPanel } from "@/components/shared/section-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";
import {
  effectiveEmployeeSchedule,
  readEmployeeSchedules,
} from "@/lib/employee-schedule";
import { cn } from "@/lib/utils";
import {
  clearEmployeeWorkSchedule,
  saveEmployeeWorkSchedule,
} from "@/services/schedule.service";
import type { Employee, WorkSchedule } from "@/types";

export function EmployeeSchedulePanel({
  schedule,
  employees,
  onSaved,
  onPreview,
}: {
  schedule: WorkSchedule;
  employees: Employee[];
  onSaved: (schedule: WorkSchedule) => void;
  onPreview: (schedule: WorkSchedule | null, label: string | null) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [resetting, setResetting] = useState(false);

  const roster = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = [...employees]
      .filter((employee) => employee.status !== "inactive")
      .filter((employee) => {
        if (!needle) return true;
        return (
          employee.name.toLowerCase().includes(needle) ||
          employee.department.toLowerCase().includes(needle) ||
          employee.position.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    if (
      employeeId &&
      !visible.some((employee) => employee.id === employeeId)
    ) {
      const current = employees.find((employee) => employee.id === employeeId);
      if (current) visible.unshift(current);
    }
    return visible;
  }, [employeeId, employees, query]);

  const selected = employees.find((employee) => employee.id === employeeId) ?? null;
  const hasCustom = Boolean(
    selected && readEmployeeSchedules(schedule)[selected.id]
  );
  const effective = selected
    ? effectiveEmployeeSchedule(schedule, selected.id)
    : null;

  useEffect(() => {
    if (!employeeId) {
      onPreview(null, null);
      return;
    }
    const person = employees.find((employee) => employee.id === employeeId);
    if (!person) {
      onPreview(null, null);
      return;
    }
    onPreview(effectiveEmployeeSchedule(schedule, person.id), person.name);
  }, [employeeId, employees, onPreview, schedule]);

  async function resetToCompany() {
    if (!selected || resetting) return;
    setResetting(true);
    const res = await clearEmployeeWorkSchedule(selected.id);
    setResetting(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("schedule.employeeReset"));
    onSaved(res.data);
  }

  return (
    <SectionPanel
      title={t("schedule.employeeTitle")}
      description={t("schedule.employeeDesc")}
      interactive={false}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            <Label htmlFor="employee-schedule-search">
              {t("schedule.searchEmployee")}
            </Label>
            <Input
              id="employee-schedule-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("schedule.searchEmployee")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee-schedule-pick">
              {t("schedule.pickEmployee")}
            </Label>
            <select
              id="employee-schedule-pick"
              value={roster.some((employee) => employee.id === employeeId) ? employeeId : ""}
              onChange={(event) => setEmployeeId(event.target.value)}
              className={cn(
                "flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm shadow-[0_1px_2px_rgba(11,20,36,0.03)]",
                "focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/18"
              )}
            >
              <option value="">{t("schedule.pickEmployee")}</option>
              {roster.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} — {employee.department}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selected && effective ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {hasCustom
                ? t("schedule.customScheduleHint")
                : t("schedule.usesCompany")}
            </p>
            <ScheduleForm
              key={selected.id}
              idPrefix={`emp-${selected.id}`}
              schedule={effective}
              title={selected.name}
              description={
                hasCustom
                  ? t("schedule.customSchedule")
                  : t("schedule.usesCompany")
              }
              saveLabel={t("schedule.saveEmployee")}
              successMessage={t("schedule.employeeSaved")}
              persist={(payload) =>
                saveEmployeeWorkSchedule(selected.id, payload)
              }
              onSaved={onSaved}
              disabled={resetting}
              secondaryAction={
                hasCustom
                  ? {
                      label: t("schedule.resetToCompany"),
                      onClick: () => void resetToCompany(),
                      disabled: resetting,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {employees.length === 0
              ? t("schedule.noEmployees")
              : t("schedule.pickEmployeeHint")}
          </p>
        )}
      </div>
    </SectionPanel>
  );
}
