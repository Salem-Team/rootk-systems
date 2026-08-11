"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MeetingDetailCard } from "@/components/work/employee-work-meeting-detail-card";
import { TaskDetailCard } from "@/components/work/employee-work-task-detail-card";
import { useTranslation } from "@/hooks/use-translation";
import { employeeOwnsPersonalMeeting, employeeOwnsPersonalTask } from "@/lib/work-utils";
import type { Locale } from "date-fns";
import type { WorkMeeting, WorkTask } from "@/types/work";
import type { WorkTab } from "@/components/work/employee-work-hub-types";

/** Mobile-only detail sheet — Dialog overlay on desktop blocks all clicks. */
export function EmployeeWorkMobileSheet({
  open,
  isMobile,
  onOpenChange,
  tab,
  selectedTask,
  selectedMeeting,
  meetings,
  nameOf,
  dateLocale,
  workEmployeeId,
  userId,
  onCycleStatus,
  onToggleSub,
  onOpenMeeting,
  onEditTask,
  onDeleteTask,
  onEditMeeting,
  onDeleteMeeting,
}: {
  open: boolean;
  isMobile: boolean;
  onOpenChange: (open: boolean) => void;
  tab: WorkTab;
  selectedTask: WorkTask | null;
  selectedMeeting: WorkMeeting | null;
  meetings: WorkMeeting[];
  nameOf: (id: string) => string;
  dateLocale: Locale;
  workEmployeeId: string;
  userId: string;
  onCycleStatus: (id: string) => void;
  onToggleSub: (taskId: string, subId: string) => void;
  onOpenMeeting: (id: string) => void;
  onEditTask: (task: WorkTask) => void;
  onDeleteTask: (task: WorkTask) => void;
  onEditMeeting: (meeting: WorkMeeting) => void;
  onDeleteMeeting: (meeting: WorkMeeting) => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open && (isMobile || tab === "tasks")} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-4 py-4 text-start">
          <SheetTitle>
            {tab === "meetings"
              ? selectedMeeting?.title ?? t("workHub.tabMeetings")
              : selectedTask?.title ?? t("workHub.tabTasks")}
          </SheetTitle>
          <SheetDescription>
            {tab === "meetings"
              ? t("workHub.meetingDetailDesc")
              : t("workHub.taskDetailDesc")}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-5.5rem)]">
          <div className="p-4 pb-8">
            {tab === "meetings" && selectedMeeting ? (
              <MeetingDetailCard
                meeting={selectedMeeting}
                nameOf={nameOf}
                dateLocale={dateLocale}
                embedded
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
            {tab !== "meetings" && selectedTask ? (
              <TaskDetailCard
                task={selectedTask}
                meetings={meetings}
                embedded
                onCycleStatus={() => onCycleStatus(selectedTask.id)}
                onToggleSub={(subId) => onToggleSub(selectedTask.id, subId)}
                onOpenMeeting={onOpenMeeting}
                onEdit={
                  employeeOwnsPersonalTask(selectedTask, workEmployeeId, userId)
                    ? () => onEditTask(selectedTask)
                    : undefined
                }
                onDelete={
                  employeeOwnsPersonalTask(selectedTask, workEmployeeId, userId)
                    ? () => onDeleteTask(selectedTask)
                    : undefined
                }
              />
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
