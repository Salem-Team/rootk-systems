"use client";

import { Loader2 } from "lucide-react";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/work/admin-work-field";
import { AdminWorkTaskEvidenceFields } from "@/components/work/admin-work-task-evidence-fields";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { TaskPriority, TaskStatus, WorkMeeting, WorkTask } from "@/types/work";
import type { TaskFormState } from "@/components/work/admin-work-panel-types";

export function AdminWorkTaskDialog({
  open,
  onOpenChange,
  isEditing,
  busy,
  taskForm,
  setTaskForm,
  editingTask,
  employees,
  meetings,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  busy: boolean;
  taskForm: TaskFormState;
  setTaskForm: (updater: (prev: TaskFormState) => TaskFormState) => void;
  editingTask?: WorkTask;
  employees: Employee[];
  meetings: WorkMeeting[];
  onSave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("workAdmin.editTask") : t("workAdmin.addTask")}
          </DialogTitle>
          <DialogDescription>{t("workAdmin.taskFormDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <Field label={t("workAdmin.fieldTitle")} htmlFor="task-title">
            <Input
              id="task-title"
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm((p) => ({ ...p, title: e.target.value }))
              }
            />
          </Field>
          <Field label={t("common.description")} htmlFor="task-desc">
            <Textarea
              id="task-desc"
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("workAdmin.fieldDue")} htmlFor="task-due">
              <Input
                id="task-due"
                type="datetime-local"
                step={60}
                value={taskForm.dueDate}
                onChange={(e) =>
                  setTaskForm((p) => ({ ...p, dueDate: e.target.value }))
                }
              />
            </Field>
            <Field label={t("workAdmin.fieldEstimate")} htmlFor="task-est">
              <Input
                id="task-est"
                type="number"
                min={0}
                max={480}
                value={taskForm.estimateMin || ""}
                placeholder="—"
                onChange={(e) =>
                  setTaskForm((p) => ({
                    ...p,
                    estimateMin: e.target.value
                      ? Number(e.target.value)
                      : 0,
                  }))
                }
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("workAdmin.fieldPriority")} htmlFor="task-priority">
              <select
                id="task-priority"
                className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm((p) => ({
                    ...p,
                    priority: e.target.value as TaskPriority,
                  }))
                }
              >
                <option value="high">{t("ops.priority.high")}</option>
                <option value="medium">{t("ops.priority.medium")}</option>
                <option value="low">{t("ops.priority.low")}</option>
              </select>
            </Field>
            <Field label={t("common.status")} htmlFor="task-status">
              <select
                id="task-status"
                className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm((p) => ({
                    ...p,
                    status: e.target.value as TaskStatus,
                  }))
                }
              >
                <option value="todo">{t("ops.statusTodo")}</option>
                <option value="in_progress">{t("ops.statusInProgress")}</option>
                <option value="completed">{t("ops.statusCompleted")}</option>
              </select>
            </Field>
            <Field
              label={t("workAdmin.fieldTag")}
              htmlFor="task-tag"
              className="sm:col-span-2"
            >
              <Input
                id="task-tag"
                value={taskForm.tag}
                onChange={(e) =>
                  setTaskForm((p) => ({ ...p, tag: e.target.value }))
                }
              />
            </Field>
          </div>
          <Field label={t("workAdmin.fieldRelatedMeeting")} htmlFor="task-meet">
            <select
              id="task-meet"
              className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
              value={taskForm.relatedMeetingId}
              onChange={(e) =>
                setTaskForm((p) => ({
                  ...p,
                  relatedMeetingId: e.target.value,
                }))
              }
            >
              <option value="">{t("workAdmin.noRelatedMeeting")}</option>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} · {m.date}
                </option>
              ))}
            </select>
          </Field>
          <EmployeeMultiPicker
            employees={employees}
            selectedIds={taskForm.assigneeIds}
            onChange={(assigneeIds) =>
              setTaskForm((p) => ({ ...p, assigneeIds }))
            }
            label={t("workAdmin.fieldAssignees")}
          />
          <Field label={t("workAdmin.fieldSubItems")} htmlFor="task-subs">
            <Textarea
              id="task-subs"
              placeholder={t("workAdmin.subItemsHint")}
              value={taskForm.subItemsText}
              onChange={(e) =>
                setTaskForm((p) => ({ ...p, subItemsText: e.target.value }))
              }
            />
          </Field>

          <AdminWorkTaskEvidenceFields
            taskForm={taskForm}
            setTaskForm={setTaskForm}
            editingTask={editingTask}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={busy} onClick={onSave}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
