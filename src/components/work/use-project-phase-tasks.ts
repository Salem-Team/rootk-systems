"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const promotionLocks = new Set<string>();
import { toast } from "sonner";
import {
  emptyTaskForm,
  taskToForm,
  type TaskFormState,
} from "@/components/work/admin-work-panel-types";
import { useTranslation } from "@/hooks/use-translation";
import { toDateTimeLocalValue, toStorageIso } from "@/lib/flexible-datetime";
import { mediaDraftsToPayload } from "@/lib/task-media";
import {
  createWorkTask,
  deleteWorkTask,
  updateWorkTask,
} from "@/services/work.service";
import type { WorkTask } from "@/types/work";
import type { WorkProjectPhase, WorkProjectTask } from "@/types/work-project";

function draftForm(task: WorkProjectTask): TaskFormState {
  return {
    ...emptyTaskForm(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? toDateTimeLocalValue(task.dueDate) : "",
    estimateMin: task.estimateMin,
    assigneeIds: [...task.assigneeIds],
  };
}

/** Full work-task dialog for tasks that belong to a saved project phase. */
export function useProjectPhaseTasks({
  projectId,
  phases,
  setPhases,
  workTasks,
  reloadTasks,
  tasksReady,
  onLinked,
}: {
  projectId: string | null;
  phases: WorkProjectPhase[];
  setPhases: (update: (phases: WorkProjectPhase[]) => WorkProjectPhase[]) => void;
  workTasks: WorkTask[];
  reloadTasks: () => Promise<void>;
  tasksReady: boolean;
  onLinked?: (
    links: { phaseId: string; taskId: string; workTaskId: string }[]
  ) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phaseId, setPhaseId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm);
  const [viewing, setViewing] = useState<WorkTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkTask | null>(null);
  const promoted = useRef<string | null>(null);

  const editingTask = useMemo(
    () => workTasks.find((task) => task.id === editingTaskId),
    [editingTaskId, workTasks]
  );

  useEffect(() => {
    if (!projectId || !tasksReady) {
      if (!projectId) promoted.current = null;
      return;
    }
    if (promoted.current === projectId) return;
    const pending = phases.flatMap((phase) =>
      phase.tasks
        .filter((task) => {
          if (task.title.trim().length < 2 || task.assigneeIds.length === 0) {
            return false;
          }
          if (
            task.workTaskId &&
            workTasks.some((row) => row.id === task.workTaskId)
          ) {
            return false;
          }
          return !workTasks.some(
            (row) =>
              row.projectId === projectId &&
              row.phaseId === phase.id &&
              row.title.trim() === task.title.trim()
          );
        })
        .map((task) => ({ phaseId: phase.id, task }))
    );
    if (pending.length === 0) {
      promoted.current = projectId;
      return;
    }
    promoted.current = projectId;
    void (async () => {
      const links: { phaseId: string; taskId: string; workTaskId: string }[] = [];
      for (const item of pending) {
        const lock = `${projectId}:${item.phaseId}:${item.task.id}`;
        if (promotionLocks.has(lock)) continue;
        promotionLocks.add(lock);
        const res = await createWorkTask({
          title: item.task.title.trim(),
          description: item.task.description.trim(),
          status: item.task.status,
          priority: item.task.priority,
          dueDate: item.task.dueDate
            ? toStorageIso(item.task.dueDate, "end")
            : "",
          estimateMin: Math.min(480, Math.max(0, item.task.estimateMin || 0)),
          tag: "",
          assigneeIds: item.task.assigneeIds,
          origin: "assigned",
          projectId,
          phaseId: item.phaseId,
          subItems: [],
        });
        if (!res.success) {
          promotionLocks.delete(lock);
          continue;
        }
        links.push({
          phaseId: item.phaseId,
          taskId: item.task.id,
          workTaskId: res.data.id,
        });
      }
      if (links.length > 0) {
        const apply = (current: WorkProjectPhase[]) =>
          current.map((phase) => ({
            ...phase,
            tasks: phase.tasks.map((task) => {
              const link = links.find(
                (row) => row.phaseId === phase.id && row.taskId === task.id
              );
              return link ? { ...task, workTaskId: link.workTaskId } : task;
            }),
          }));
        setPhases(apply);
        onLinked?.(links);
      }
      await reloadTasks();
    })();
  }, [onLinked, phases, projectId, reloadTasks, setPhases, tasksReady, workTasks]);

  function requireProject() {
    if (projectId) return true;
    toast.error(t("workAdmin.projects.saveProjectFirst"));
    return false;
  }

  function openCreate(nextPhaseId: string, draft?: WorkProjectTask) {
    if (!requireProject()) return;
    setEditingTaskId(null);
    setPhaseId(nextPhaseId);
    setDraftId(draft?.id ?? null);
    setForm(draft ? draftForm(draft) : emptyTaskForm());
    setOpen(true);
  }

  function openEdit(task: WorkTask) {
    setEditingTaskId(task.id);
    setPhaseId(task.phaseId ?? null);
    setDraftId(null);
    setForm(taskToForm(task));
    setViewing(null);
    setOpen(true);
  }

  function linkDraft(createdId: string) {
    if (!phaseId) return;
    const currentPhaseId = phaseId;
    const currentDraftId = draftId;
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) return phase;
        if (
          currentDraftId &&
          phase.tasks.some((task) => task.id === currentDraftId)
        ) {
          return {
            ...phase,
            tasks: phase.tasks.map((task) =>
              task.id === currentDraftId
                ? { ...task, workTaskId: createdId }
                : task
            ),
          };
        }
        return phase;
      })
    );
  }

  async function save(options?: { addAnother?: boolean }) {
    if (!projectId || !phaseId) {
      toast.error(t("workAdmin.projects.saveProjectFirst"));
      return;
    }
    if (!form.title.trim() || form.assigneeIds.length === 0) {
      toast.error(t("workAdmin.validationTask"));
      return;
    }
    const addAnother = Boolean(options?.addAnother) && !editingTaskId;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate ? toStorageIso(form.dueDate, "exact") : "",
      tag: form.tag.trim(),
      estimateMin: form.estimateMin || 0,
      assigneeIds: form.assigneeIds,
      relatedMeetingId: form.relatedMeetingId || undefined,
      origin: "assigned" as const,
      requireEvidenceLinks: Boolean(form.requireEvidenceLinks),
      requireEvidenceNotes: Boolean(form.requireEvidenceNotes),
      requireEvidenceMedia: Boolean(form.requireEvidenceMedia),
      media: mediaDraftsToPayload(form.mediaDrafts),
      projectId,
      phaseId,
      subItems: form.subItemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((label) => {
          const existing = editingTask?.subItems.find((item) => item.label === label);
          return { id: existing?.id, label, done: existing?.done ?? false };
        }),
    };
    setBusy(true);
    const res = editingTaskId
      ? await updateWorkTask(editingTaskId, payload)
      : await createWorkTask(payload);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    if (!editingTaskId) {
      linkDraft(res.data.id);
      if (draftId) {
        onLinked?.([
          { phaseId, taskId: draftId, workTaskId: res.data.id },
        ]);
      }
    }
    await reloadTasks();
    if (addAnother) {
      setDraftId(null);
      setForm(emptyTaskForm());
      toast.success(t("workAdmin.taskCreatedAddAnother"));
      return;
    }
    setOpen(false);
    toast.success(
      editingTaskId ? t("workAdmin.taskUpdated") : t("workAdmin.taskCreated")
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteWorkTask(deleteTarget.id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    const removedId = deleteTarget.id;
    setPhases((current) =>
      current.map((phase) => ({
        ...phase,
        tasks: phase.tasks.filter(
          (task) => task.workTaskId !== removedId && task.id !== removedId
        ),
      }))
    );
    setDeleteTarget(null);
    await reloadTasks();
    toast.success(t("workAdmin.taskDeleted"));
  }

  return {
    open,
    setOpen,
    busy,
    form,
    setForm,
    editingTask,
    viewing,
    setViewing,
    deleteTarget,
    setDeleteTarget,
    openCreate,
    openEdit,
    save,
    confirmDelete,
  };
}
