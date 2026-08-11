import { useMemo, useState } from "react";
import { toast } from "sonner";
import { assignOrganicAdsQuota } from "@/services/organic-ads.service";
import {
  createWorkMeeting,
  createWorkTask,
  deleteWorkMeeting,
  deleteWorkTask,
  updateWorkMeeting,
  updateWorkTask,
} from "@/services/work.service";
import { emitTargetsUpdated, emitWorkUpdated } from "@/lib/events";
import { clampOrganicAdsQuantity } from "@/lib/organic-ads-task-match";
import { useTranslation } from "@/hooks/use-translation";
import { toStorageIso } from "@/lib/flexible-datetime";
import type { WorkMeeting, WorkTask } from "@/types/work";
import {
  emptyMeetingForm,
  emptyTaskForm,
  meetingToForm,
  taskToForm,
  type MeetingFormState,
  type TaskFormState,
} from "@/components/work/admin-work-panel-types";

/** Owns create/edit/delete dialog state and mutations for the admin work panel. */
export function useAdminWorkPanelForms({
  tasks,
  workEmployeeId,
  reload,
}: {
  tasks: WorkTask[];
  workEmployeeId: string;
  reload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "task"; id: string; title: string }
    | { kind: "meeting"; id: string; title: string }
    | null
  >(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<WorkTask | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [meetingForm, setMeetingForm] = useState<MeetingFormState>(() =>
    emptyMeetingForm(workEmployeeId)
  );

  const editingTask = useMemo(
    () => (editingTaskId ? tasks.find((x) => x.id === editingTaskId) : undefined),
    [tasks, editingTaskId]
  );

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm());
    setTaskDialogOpen(true);
  }

  function openEditTask(task: WorkTask) {
    setEditingTaskId(task.id);
    setTaskForm(taskToForm(task));
    setTaskDialogOpen(true);
  }

  function openViewTask(task: WorkTask) {
    setViewingTask(task);
  }

  function openCreateMeeting() {
    setEditingMeetingId(null);
    setMeetingForm(emptyMeetingForm(workEmployeeId));
    setMeetingDialogOpen(true);
  }

  function openEditMeeting(meeting: WorkMeeting) {
    setEditingMeetingId(meeting.id);
    setMeetingForm(meetingToForm(meeting));
    setMeetingDialogOpen(true);
  }

  async function saveTask() {
    if (!taskForm.title.trim() || taskForm.assigneeIds.length === 0) {
      toast.error(t("workAdmin.validationTask"));
      return;
    }
    setBusy(true);
    if (!editingTaskId && taskForm.countsAsOrganicAd) {
      const res = await assignOrganicAdsQuota({
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        quantity: clampOrganicAdsQuantity(taskForm.organicAdsCount || 1),
        assigneeIds: taskForm.assigneeIds,
        dueDate: taskForm.dueDate
          ? toStorageIso(taskForm.dueDate, "end")
          : undefined,
        priority: taskForm.priority,
      });
      setBusy(false);
      if (!res.success) {
        toast.error(res.message ?? t("common.error"));
        return;
      }
      setTaskDialogOpen(false);
      emitTargetsUpdated();
      emitWorkUpdated();
      await reload();
      toast.success(t("workAdmin.organicAdsAssigned"));
      return;
    }
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      status: taskForm.status,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate
        ? toStorageIso(taskForm.dueDate, "exact")
        : "",
      tag: taskForm.tag.trim(),
      estimateMin: taskForm.estimateMin || 0,
      assigneeIds: taskForm.assigneeIds,
      relatedMeetingId: taskForm.relatedMeetingId || undefined,
      origin: "assigned" as const,
      requireEvidenceLinks: Boolean(taskForm.requireEvidenceLinks),
      requireEvidenceNotes: Boolean(taskForm.requireEvidenceNotes),
      subItems: taskForm.subItemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((label) => {
          const existing = editingTaskId
            ? tasks
                .find((x) => x.id === editingTaskId)
                ?.subItems.find((s) => s.label === label)
            : undefined;
          return {
            id: existing?.id,
            label,
            done: existing?.done ?? false,
          };
        }),
    };
    const res = editingTaskId
      ? await updateWorkTask(editingTaskId, payload)
      : await createWorkTask(payload);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setTaskDialogOpen(false);
    await reload();
    toast.success(
      editingTaskId ? t("workAdmin.taskUpdated") : t("workAdmin.taskCreated")
    );
  }

  async function saveMeeting() {
    if (
      !meetingForm.title.trim() ||
      !meetingForm.location.trim() ||
      meetingForm.participantIds.length === 0
    ) {
      toast.error(t("workAdmin.validationMeeting"));
      return;
    }
    setBusy(true);
    const payload = {
      title: meetingForm.title.trim(),
      date: meetingForm.date,
      startTime: meetingForm.startTime,
      endTime: meetingForm.endTime,
      location: meetingForm.location.trim(),
      organizerId: meetingForm.organizerId || workEmployeeId,
      participantIds: meetingForm.participantIds,
      agenda: meetingForm.agendaText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      notes: meetingForm.notes.trim(),
      joinUrl: meetingForm.joinUrl.trim(),
      origin: "assigned" as const,
    };
    const res = editingMeetingId
      ? await updateWorkMeeting(editingMeetingId, payload)
      : await createWorkMeeting(payload);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setMeetingDialogOpen(false);
    await reload();
    toast.success(
      editingMeetingId
        ? t("workAdmin.meetingUpdated")
        : t("workAdmin.meetingCreated")
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res =
      deleteTarget.kind === "task"
        ? await deleteWorkTask(deleteTarget.id)
        : await deleteWorkMeeting(deleteTarget.id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDeleteTarget(null);
    await reload();
    toast.success(
      deleteTarget.kind === "task"
        ? t("workAdmin.taskDeleted")
        : t("workAdmin.meetingDeleted")
    );
  }

  return {
    busy,
    taskDialogOpen,
    setTaskDialogOpen,
    meetingDialogOpen,
    setMeetingDialogOpen,
    deleteTarget,
    setDeleteTarget,
    editingTaskId,
    editingTask,
    viewingTask,
    setViewingTask,
    editingMeetingId,
    taskForm,
    setTaskForm,
    meetingForm,
    setMeetingForm,
    openCreateTask,
    openEditTask,
    openViewTask,
    openCreateMeeting,
    openEditMeeting,
    saveTask,
    saveMeeting,
    confirmDelete,
  };
}
