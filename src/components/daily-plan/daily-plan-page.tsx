"use client";

import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { DailyPlanNowCard } from "@/components/daily-plan/daily-plan-now-card";
import { DailyPlanTimeline } from "@/components/daily-plan/daily-plan-timeline";
import { DailyPlanSlotSheet } from "@/components/daily-plan/daily-plan-slot-sheet";
import { DailyReportSheet } from "@/components/daily-plan/daily-report-sheet";
import { useDailyPlanPage } from "@/components/daily-plan/use-daily-plan-page";
import { useDailyReportSheet } from "@/components/daily-plan/use-daily-report-sheet";

export function DailyPlanPage() {
  const page = useDailyPlanPage();
  const report = useDailyReportSheet();

  if (!page.ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={page.t("dailyPlan.eyebrow")}
        title={page.plan?.title || page.t("dailyPlan.title")}
        description={
          page.canEdit
            ? page.t("dailyPlan.adminDesc")
            : page.t("dailyPlan.employeeDesc")
        }
        actions={
          <div
            className={
              page.canEdit
                ? "grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap"
                : "grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto"
            }
          >
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:h-9 sm:w-auto"
              onClick={report.openReport}
            >
              <ClipboardList className="me-1.5 h-4 w-4" aria-hidden />
              {page.t("dailyPlan.report")}
            </Button>
            {page.canEdit ? (
              <Button
                type="button"
                className="h-11 w-full sm:h-9 sm:w-auto"
                onClick={page.openCreate}
              >
                <Plus className="me-1.5 h-4 w-4" aria-hidden />
                {page.t("dailyPlan.addBlock")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="space-y-3 sm:space-y-4">
        <DailyPlanNowCard
          snapshot={page.snapshot}
          now={page.now}
          locale={page.locale}
        />
        <DailyPlanTimeline
          slots={page.plan?.slots ?? []}
          snapshot={page.snapshot}
          locale={page.locale}
          canEdit={page.canEdit}
          onEdit={page.openEdit}
          onDelete={(slot) => void page.deleteSlot(slot)}
        />
      </div>

      {page.canEdit ? (
        <DailyPlanSlotSheet
          open={page.sheetOpen}
          onOpenChange={page.setSheetOpen}
          editing={page.editing}
          busy={page.busy}
          onSave={(input) => void page.saveSlot(input)}
        />
      ) : null}

      <DailyReportSheet
        open={report.open}
        onOpenChange={report.setOpen}
        date={report.date}
        onDateChange={report.setDate}
        loading={report.loading}
        report={report.report}
        error={report.error}
      />
    </>
  );
}
