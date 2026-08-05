"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { WeeklyPlanner } from "@/components/schedule/weekly-planner";
import { ScheduleForm } from "@/components/schedule/schedule-form";
import { HolidaysList } from "@/components/schedule/holidays-list";
import { getWorkSchedule } from "@/services/schedule.service";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import type { Holiday, WorkSchedule } from "@/types";

export default function SchedulePage() {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const isAdmin = role === "admin";
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getWorkSchedule();
        if (!mounted) return;
        if (res.success) setSchedule(res.data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaved = useCallback((next: WorkSchedule) => {
    setSchedule(next);
  }, []);

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
          isAdmin
            ? t("schedule.description")
            : t("employeeHome.scheduleDesc")
        }
      />
      <div className="space-y-6">
        {!isAdmin ? (
          <div className="surface-panel relative overflow-hidden px-4 py-3.5">
            <div
              aria-hidden
              className="absolute inset-y-0 start-0 w-0.5 bg-primary"
            />
            <p className="section-label text-primary/80">
              {t("employeeHome.readOnlyTitle")}
            </p>
            <p className="mt-1 ps-0 text-sm text-muted-foreground">
              {t("employeeHome.readOnlyHint")}
            </p>
          </div>
        ) : null}
        <WeeklyPlanner schedule={schedule} />
        {isAdmin ? (
          <div className="grid gap-6 xl:grid-cols-5">
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
