"use client";

import { deleteWorkMeeting, deleteWorkTask } from "@/services/work.service";
import { EmployeeWorkTaskComposerDialog } from "@/components/work/employee-work-task-composer-dialog";
import { EmployeeWorkMeetingComposerDialog } from "@/components/work/employee-work-meeting-composer-dialog";
import { useEmployeeWorkComposer } from "@/components/work/use-employee-work-composer";
import type { Employee } from "@/types";
import type { WorkMeeting, WorkTask } from "@/types/work";
import type { ComposerMode } from "@/components/work/employee-work-composer-types";

export {
  EmployeeComposerTriggers,
  OriginBadge,
} from "@/components/work/employee-work-composer-triggers";

interface EmployeeWorkComposerProps {
  selfId: string;
  employees: Employee[];
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  editingTask?: WorkTask | null;
  editingMeeting?: WorkMeeting | null;
  onSaved: () => void | Promise<void>;
}

/** Professional create/edit dialogs for employee personal tasks & meetings. */
export function EmployeeWorkComposer({
  selfId,
  employees,
  mode,
  onModeChange,
  editingTask = null,
  editingMeeting = null,
  onSaved,
}: EmployeeWorkComposerProps) {
  const composer = useEmployeeWorkComposer({
    selfId,
    employees,
    mode,
    onModeChange,
    editingTask,
    editingMeeting,
    onSaved,
  });

  return (
    <>
      <EmployeeWorkTaskComposerDialog
        open={composer.taskOpen}
        onOpenChange={(open) => {
          if (!open) onModeChange(null);
        }}
        isEditing={composer.isEditingTask}
        busy={composer.busy}
        taskDraft={composer.taskDraft}
        setTaskDraft={composer.setTaskDraft}
        onSave={() => void composer.saveTask()}
      />

      <EmployeeWorkMeetingComposerDialog
        open={composer.meetingOpen}
        onOpenChange={(open) => {
          if (!open) onModeChange(null);
        }}
        isEditing={composer.isEditingMeeting}
        busy={composer.busy}
        meetingDraft={composer.meetingDraft}
        setMeetingDraft={composer.setMeetingDraft}
        peers={composer.peers}
        selfId={selfId}
        onSave={() => void composer.saveMeeting()}
      />
    </>
  );
}

export async function removePersonalWork(
  kind: "task" | "meeting",
  id: string
) {
  return kind === "task" ? deleteWorkTask(id) : deleteWorkMeeting(id);
}
