import { useState } from "react";
import { toast } from "sonner";
import { removePersonalWork } from "@/components/work/employee-work-composer";
import { toggleWorkTaskSubItem, updateWorkTaskStatus } from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import {
  employeeOwnsPersonalMeeting,
  employeeOwnsPersonalTask,
} from "@/lib/work-utils";
import { nextTaskStatus, taskRequiresEvidence } from "@/lib/task-evidence";
import type { WorkMeeting, WorkTask } from "@/types/work";
import type { ComposerMode } from "@/components/work/employee-work-hub-types";

/** Owns the personal-composer, task-progress, and evidence-dialog interactions for the hub. */
export function useEmployeeWorkHubActions({
  tasks,
  setTasks,
  workEmployeeId,
  userId,
  selectedTaskId,
  setSelectedTaskId,
  selectedMeetingId,
  setSelectedMeetingId,
  reload,
}: {
  tasks: WorkTask[];
  setTasks: (updater: (prev: WorkTask[]) => WorkTask[]) => void;
  workEmployeeId: string;
  userId: string;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedMeetingId: string | null;
  setSelectedMeetingId: (id: string | null) => void;
  reload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<WorkMeeting | null>(null);
  const [evidenceTask, setEvidenceTask] = useState<WorkTask | null>(null);

  async function cycleTaskStatus(id: string) {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    const next = nextTaskStatus(task.status);
    if (next === "completed" && taskRequiresEvidence(task)) {
      setEvidenceTask(task);
      return;
    }
    setTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: next } : x))
    );
    const res = await updateWorkTaskStatus(id, next);
    if (!res.success) await reload();
  }

  function handleEvidenceCompleted(updated: WorkTask) {
    setTasks((prev) =>
      prev.map((x) => (x.id === updated.id ? updated : x))
    );
    setEvidenceTask(null);
  }

  async function toggleSubItem(taskId: string, subId: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id !== taskId
          ? task
          : {
              ...task,
              subItems: task.subItems.map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s
              ),
            }
      )
    );
    const res = await toggleWorkTaskSubItem(taskId, subId);
    if (!res.success) await reload();
  }

  function openCreateTask() {
    if (!workEmployeeId) {
      toast.error(t("common.error"));
      return;
    }
    setEditingMeeting(null);
    setEditingTask(null);
    setComposerMode("task");
  }

  function openCreateMeeting() {
    if (!workEmployeeId) {
      toast.error(t("common.error"));
      return;
    }
    setEditingTask(null);
    setEditingMeeting(null);
    setComposerMode("meeting");
  }

  function openEditTask(task: WorkTask) {
    if (!employeeOwnsPersonalTask(task, workEmployeeId, userId)) return;
    setEditingMeeting(null);
    setEditingTask(task);
    setComposerMode("task");
  }

  function openEditMeeting(meeting: WorkMeeting) {
    if (!employeeOwnsPersonalMeeting(meeting, workEmployeeId, userId)) return;
    setEditingTask(null);
    setEditingMeeting(meeting);
    setComposerMode("meeting");
  }

  async function handleDeletePersonal(
    kind: "task" | "meeting",
    id: string
  ) {
    const res = await removePersonalWork(kind, id);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    if (kind === "task" && selectedTaskId === id) setSelectedTaskId(null);
    if (kind === "meeting" && selectedMeetingId === id) {
      setSelectedMeetingId(null);
    }
    await reload();
    toast.success(
      kind === "task" ? t("workHub.taskDeleted") : t("workHub.meetingDeleted")
    );
  }

  return {
    composerMode,
    setComposerMode,
    editingTask,
    setEditingTask,
    editingMeeting,
    setEditingMeeting,
    evidenceTask,
    setEvidenceTask,
    cycleTaskStatus,
    handleEvidenceCompleted,
    toggleSubItem,
    openCreateTask,
    openCreateMeeting,
    openEditTask,
    openEditMeeting,
    handleDeletePersonal,
  };
}
