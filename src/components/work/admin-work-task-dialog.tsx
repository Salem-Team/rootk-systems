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
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/work/admin-work-field";
import { AdminWorkTaskEvidenceFields } from "@/components/work/admin-work-task-evidence-fields";
import { useTranslation } from "@/hooks/use-translation";
import { ORGANIC_ADS_MAX_QUANTITY, ORGANIC_ADS_TAG } from "@/lib/organic-ads-task-match";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TaskPriority, TaskStatus, WorkMeeting, WorkTask } from "@/types/work";
import type { TaskFormState } from "@/components/work/admin-work-panel-types";

const selectClassName = cn(
  "flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-border focus-visible:border-primary/45 focus-visible:outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-ring/18"
);

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
  onSave: (options?: { addAnother?: boolean }) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,800px)] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border/55 pb-3.5">
          <DialogTitle>
            {isEditing ? t("workAdmin.editTask") : t("workAdmin.addTask")}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {isEditing
              ? t("workAdmin.taskFormDesc")
              : t("workAdmin.taskFormDescMulti")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-start">
            <div className="grid gap-3.5">
              <Field label={t("workAdmin.fieldTitle")} htmlFor="task-title">
                <Input
                  id="task-title"
                  autoFocus
                  placeholder={t("workAdmin.fieldTitle")}
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </Field>

              <Field label={t("common.description")} htmlFor="task-desc">
                <Textarea
                  id="task-desc"
                  rows={3}
                  className="min-h-[76px] resize-y"
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
                <Field
                  label={t("workAdmin.fieldPriority")}
                  htmlFor="task-priority"
                >
                  <select
                    id="task-priority"
                    className={selectClassName}
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
                    className={selectClassName}
                    value={taskForm.status}
                    onChange={(e) =>
                      setTaskForm((p) => ({
                        ...p,
                        status: e.target.value as TaskStatus,
                      }))
                    }
                  >
                    <option value="todo">{t("ops.statusTodo")}</option>
                    <option value="in_progress">
                      {t("ops.statusInProgress")}
                    </option>
                    <option value="completed">
                      {t("ops.statusCompleted")}
                    </option>
                  </select>
                </Field>
                <Field label={t("workAdmin.fieldTag")} htmlFor="task-tag">
                  <Input
                    id="task-tag"
                    value={taskForm.tag}
                    onChange={(e) =>
                      setTaskForm((p) => ({ ...p, tag: e.target.value }))
                    }
                  />
                </Field>
                <Field
                  label={t("workAdmin.fieldRelatedMeeting")}
                  htmlFor="task-meet"
                >
                  <select
                    id="task-meet"
                    className={selectClassName}
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
              </div>

              <Field label={t("workAdmin.fieldSubItems")} htmlFor="task-subs">
                <Textarea
                  id="task-subs"
                  rows={3}
                  className="min-h-[72px] resize-y"
                  placeholder={t("workAdmin.subItemsHint")}
                  value={taskForm.subItemsText}
                  onChange={(e) =>
                    setTaskForm((p) => ({
                      ...p,
                      subItemsText: e.target.value,
                    }))
                  }
                />
              </Field>

              <AdminWorkTaskEvidenceFields
                taskForm={taskForm}
                setTaskForm={setTaskForm}
                editingTask={editingTask}
              />
            </div>

            <aside className="grid gap-3.5 lg:sticky lg:top-0">
              <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5">
                <EmployeeMultiPicker
                  employees={employees}
                  selectedIds={taskForm.assigneeIds}
                  onChange={(assigneeIds) =>
                    setTaskForm((p) => ({ ...p, assigneeIds }))
                  }
                  label={t("workAdmin.fieldAssignees")}
                  listClassName="max-h-[min(18rem,42vh)] lg:max-h-[min(22rem,48vh)]"
                />
              </div>

              {!isEditing ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {t("workAdmin.fieldOrganicAds")}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {t("workAdmin.fieldOrganicAdsDesc")}
                      </p>
                    </div>
                    <Switch
                      checked={taskForm.countsAsOrganicAd}
                      onCheckedChange={(countsAsOrganicAd) =>
                        setTaskForm((p) => ({
                          ...p,
                          countsAsOrganicAd,
                          tag: countsAsOrganicAd ? ORGANIC_ADS_TAG : p.tag,
                          organicAdsCount: countsAsOrganicAd
                            ? Math.max(1, p.organicAdsCount || 1)
                            : p.organicAdsCount,
                        }))
                      }
                      aria-label={t("workAdmin.fieldOrganicAds")}
                    />
                  </div>
                  {taskForm.countsAsOrganicAd ? (
                    <Field
                      label={t("workAdmin.fieldOrganicAdsCount")}
                      htmlFor="task-ads-count"
                    >
                      <Input
                        id="task-ads-count"
                        type="number"
                        min={1}
                        max={ORGANIC_ADS_MAX_QUANTITY}
                        value={taskForm.organicAdsCount || 1}
                        onChange={(e) =>
                          setTaskForm((p) => ({
                            ...p,
                            organicAdsCount: Number(e.target.value) || 1,
                          }))
                        }
                      />
                    </Field>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="sm:me-auto"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            {!isEditing ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => onSave({ addAnother: true })}
              >
                {busy ? <Loader2 className="animate-spin" /> : null}
                {t("workAdmin.saveAndAddAnother")}
              </Button>
            ) : null}
            <Button type="button" disabled={busy} onClick={() => onSave()}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
