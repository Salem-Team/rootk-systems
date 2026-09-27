"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { EmployeeSchedulePanel } from "@/components/schedule/employee-schedule-panel";
import { WeeklyPlanner } from "@/components/schedule/weekly-planner";
import { ScheduleForm } from "@/components/schedule/schedule-form";
import { HolidaysList } from "@/components/schedule/holidays-list";
import { getWorkforceEmployees } from "@/services/employees.service";
import { getWorkSchedule } from "@/services/schedule.service";
import { useHasAnyPermission } from "@/hooks/use-permission";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee, Holiday, WorkSchedule } from "@/types";

export default function SchedulePage() {
  const { t } = useTranslation();
  const canEditSchedule = useHasAnyPermission([
    "schedule.editPolicies",
    "schedule.manageHolidays",
    "schedule.manageShifts",
  ]);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [preview, setPreview] = useState<{
    schedule: WorkSchedule;
    label: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [scheduleRes, peopleRes] = await Promise.all([
          getWorkSchedule(),
          canEditSchedule ? getWorkforceEmployees() : Promise.resolve(null),
        ]);
        if (!mounted) return;
        if (scheduleRes.success) setSchedule(scheduleRes.data);
        if (peopleRes?.success) setEmployees(peopleRes.data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [canEditSchedule]);

  const handleSaved = useCallback((next: WorkSchedule) => {
    setSchedule(next);
  }, []);

  const handlePreview = useCallback(
    (next: WorkSchedule | null, label: string | null) => {
      setPreview(next && label ? { schedule: next, label } : null);
    },
    []
  );

  const handleHolidaysChanged = useCallback((holidays: Holiday[]) => {
    setSchedule((prev) => (prev ? { ...prev, holidays } : prev));
  }, []);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!schedule) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow={t("schedule.eyebrow")}
          title={t("schedule.title")}
        />
        <EmptyState
          title={t("common.error")}
          description={t("schedule.loadFailed")}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("schedule.eyebrow")}
        title={t("schedule.title")}
        description={
          canEditSchedule
            ? t("schedule.description")
            : t("employeeHome.scheduleDesc")
        }
      />
      <div className="space-y-4 sm:space-y-6">
        <WeeklyPlanner
          schedule={preview?.schedule ?? schedule}
          subject={preview?.label}
        />
        {canEditSchedule ? (
          <>
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-5">
              <div className="xl:col-span-3">
                <ScheduleForm schedule={schedule} onSaved={handleSaved} />
              </div>
              <div className="xl:col-span-2">
                <HolidaysList
                  holidays={schedule.holidays}
                  onChanged={handleHolidaysChanged}
                />
              </div>
            </div>
            <EmployeeSchedulePanel
              schedule={schedule}
              employees={employees}
              onSaved={handleSaved}
              onPreview={handlePreview}
            />
          </>
        ) : (
          <HolidaysList
            holidays={schedule.holidays}
            onChanged={handleHolidaysChanged}
            readOnly
          />
        )}
      </div>
    </PageTransition>
  );
}
