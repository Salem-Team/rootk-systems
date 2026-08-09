import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createWorkMeeting,
  createWorkTask,
  updateWorkMeeting,
  updateWorkTask,
} from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import { toStorageIso } from "@/lib/flexible-datetime";
import type { Employee } from "@/types";
import type { WorkMeeting, WorkTask } from "@/types/work";
import {
  emptyMeetingDraft,
  emptyTaskDraft,
  meetingToDraft,
  taskToDraft,
  type ComposerMode,
  type MeetingDraft,
  type TaskDraft,
} from "@/components/work/employee-work-composer-types";

/** Owns draft state and save mutations for the employee personal task/meeting composer. */
export function useEmployeeWorkComposer({
  selfId,
  employees,
  mode,
  onModeChange,
  editingTask,
  editingMeeting,
  onSaved,
}: {
  selfId: string;
  employees: Employee[];
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  editingTask: WorkTask | null;
  editingMeeting: WorkMeeting | null;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
  const [meetingDraft, setMeetingDraft] = useState<MeetingDraft>(() =>
    emptyMeetingDraft(selfId)
  );

  const isEditingTask = Boolean(editingTask);
  const isEditingMeeting = Boolean(editingMeeting);
  const taskOpen = mode === "task";
  const meetingOpen = mode === "meeting";

  const peers = useMemo(
    () => employees.filter((e) => e.status !== "inactive"),
    [employees]
  );

  useEffect(() => {
    if (mode === "task") {
      setTaskDraft(editingTask ? taskToDraft(editingTask) : emptyTaskDraft());
    }
    if (mode === "meeting") {
      setMeetingDraft(
        editingMeeting
          ? meetingToDraft(editingMeeting)
          : emptyMeetingDraft(selfId)
      );
    }
  }, [mode, editingTask, editingMeeting, selfId]);

  async function saveTask() {
    if (!selfId) {
      toast.error(t("common.error"));
      return;
    }
    if (!taskDraft.title.trim()) {
      toast.error(t("workHub.validationTask"));
      return;
    }
    setBusy(true);
    const subItems = taskDraft.subItemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ label, done: false }));

    const payload = {
      title: taskDraft.title.trim(),
      description: taskDraft.description.trim(),
      priority: taskDraft.priority,
      dueDate: taskDraft.dueDate
        ? toStorageIso(taskDraft.dueDate, "exact")
        : "",
      tag: taskDraft.tag.trim() || "Personal",
      estimateMin: taskDraft.estimateMin || 0,
      assigneeIds: [selfId],
      origin: "personal" as const,
      status: "todo" as const,
      subItems,
    };

    const res = editingTask
      ? await updateWorkTask(editingTask.id, {
          ...payload,
          status: editingTask.status,
          subItems: taskDraft.subItemsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((label, i) => ({
              id: editingTask.subItems[i]?.id,
              label,
              done: editingTask.subItems[i]?.done ?? false,
            })),
        })
      : await createWorkTask(payload);

    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onModeChange(null);
    await onSaved();
    toast.success(
      editingTask ? t("workHub.taskUpdated") : t("workHub.taskCreated")
    );
  }

  async function saveMeeting() {
    if (!selfId) {
      toast.error(t("common.error"));
      return;
    }
    if (!meetingDraft.title.trim() || !meetingDraft.location.trim()) {
      toast.error(t("workHub.validationMeeting"));
      return;
    }
    if (meetingDraft.endTime <= meetingDraft.startTime) {
      toast.error(t("workHub.validationTime"));
      return;
    }
    setBusy(true);
    const participantIds = Array.from(
      new Set([selfId, ...meetingDraft.participantIds])
    );
    const agenda = meetingDraft.agendaText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: meetingDraft.title.trim(),
      date: meetingDraft.date,
      startTime: meetingDraft.startTime,
      endTime: meetingDraft.endTime,
      location: meetingDraft.location.trim(),
      organizerId: selfId,
      participantIds,
      agenda,
      notes: meetingDraft.notes.trim(),
      joinUrl: meetingDraft.joinUrl.trim(),
      origin: "personal" as const,
    };

    const res = editingMeeting
      ? await updateWorkMeeting(editingMeeting.id, payload)
      : await createWorkMeeting(payload);

    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onModeChange(null);
    await onSaved();
    toast.success(
      editingMeeting
        ? t("workHub.meetingUpdated")
        : t("workHub.meetingCreated")
    );
  }

  return {
    busy,
    taskDraft,
    setTaskDraft,
    meetingDraft,
    setMeetingDraft,
    isEditingTask,
    isEditingMeeting,
    taskOpen,
    meetingOpen,
    peers,
    saveTask,
    saveMeeting,
  };
}
