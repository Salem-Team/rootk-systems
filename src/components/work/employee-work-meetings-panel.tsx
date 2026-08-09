"use client";

import type { Locale } from "date-fns";
import { Button } from "@/components/ui/button";
import { MeetingList } from "@/components/work/employee-work-meeting-list";
import { MeetingDetailCard } from "@/components/work/employee-work-meeting-detail-card";
import { useTranslation } from "@/hooks/use-translation";
import { employeeOwnsPersonalMeeting } from "@/lib/work-utils";
import type { OriginFilter } from "@/components/work/employee-work-hub-types";
import type { WorkMeeting } from "@/types/work";

export function EmployeeWorkMeetingsPanel({
  todayMeetings,
  upcomingMeetings,
  selectedMeeting,
  originFilter,
  setOriginFilter,
  dateLocale,
  nameOf,
  workEmployeeId,
  userId,
  onSelectMeeting,
  onCreateMeeting,
  onEditMeeting,
  onDeleteMeeting,
}: {
  todayMeetings: WorkMeeting[];
  upcomingMeetings: WorkMeeting[];
  selectedMeeting: WorkMeeting | null;
  originFilter: OriginFilter;
  setOriginFilter: (v: OriginFilter) => void;
  dateLocale: Locale;
  nameOf: (id: string) => string;
  workEmployeeId: string;
  userId: string;
  onSelectMeeting: (id: string) => void;
  onCreateMeeting: () => void;
  onEditMeeting: (meeting: WorkMeeting) => void;
  onDeleteMeeting: (meeting: WorkMeeting) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "assigned", "personal"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={originFilter === f ? "default" : "outline"}
              className="h-8 rounded-full px-3 text-[12px]"
              onClick={() => setOriginFilter(f)}
            >
              {f === "all"
                ? t("common.all")
                : f === "assigned"
                  ? t("workHub.originAssigned")
                  : t("workHub.originPersonal")}
            </Button>
          ))}
        </div>
        <Button type="button" size="sm" onClick={onCreateMeeting}>
          {t("workHub.addPersonalMeeting")}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <MeetingList
            title={t("ops.meetingsToday")}
            items={todayMeetings}
            activeId={selectedMeeting?.id}
            onSelect={onSelectMeeting}
            dateLocale={dateLocale}
            onCreate={onCreateMeeting}
          />
          <MeetingList
            title={t("ops.meetingsUpcoming")}
            items={upcomingMeetings}
            activeId={selectedMeeting?.id}
            onSelect={onSelectMeeting}
            dateLocale={dateLocale}
          />
        </div>
        <div className="hidden lg:col-span-7 lg:block">
          {selectedMeeting ? (
            <MeetingDetailCard
              meeting={selectedMeeting}
              nameOf={nameOf}
              dateLocale={dateLocale}
              onEdit={
                employeeOwnsPersonalMeeting(selectedMeeting, workEmployeeId, userId)
                  ? () => onEditMeeting(selectedMeeting)
                  : undefined
              }
              onDelete={
                employeeOwnsPersonalMeeting(selectedMeeting, workEmployeeId, userId)
                  ? () => onDeleteMeeting(selectedMeeting)
                  : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
