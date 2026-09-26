"use client";

import { ListPlus, Loader2, Pencil } from "lucide-react";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DateTime12Field } from "@/components/shared/datetime-12-field";
import { Field } from "@/components/work/admin-work-field";
import { AdminWorkTaskEvidenceFields } from "@/components/work/admin-work-task-evidence-fields";
import { TaskMediaPicker } from "@/components/work/task-media-picker";
import { useTranslation } from "@/hooks/use-translation";
import { ORGANIC_ADS_MAX_QUANTITY, ORGANIC_ADS_TAG } from "@/lib/organic-ads-task-match";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";
import type { TaskFormState } from "@/components/work/admin-work-panel-types";

const selectClassName = cn(
  "flex h-11 w-full rounded-xl border border-border/85 bg-card px-3 text-base sm:h-9 sm:rounded-lg sm:text-sm",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-border focus-visible:border-primary/45 focus-visible:outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-ring/18"
);

const inputClassName = "h-11 rounded-xl text-base sm:h-9 sm:rounded-lg sm:text-sm";

function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-3.5 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

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
  hideOrganicAds = false,
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
  hideOrganicAds?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,920px)] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(92vw,56rem)] sm:max-w-[min(92vw,56rem)] sm:p-0">
        <DialogHeader className="shrink-0 border-b border-border/55 px-4 pb-3.5 pt-1 sm:px-5 sm:pt-5">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="icon-well h-9 w-9 shrink-0">
              {isEditing ? (
                <Pencil className="h-4 w-4" aria-hidden />
              ) : (
                <ListPlus className="h-4 w-4" aria-hidden />
              )}
            </span>
            <span className="min-w-0">
              {isEditing ? t("workAdmin.editTask") : t("workAdmin.addTask")}
            </span>
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {isEditing
              ? t("workAdmin.taskFormDesc")
              : t("workAdmin.taskFormDescMulti")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="bg-muted/15 px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(17rem,0.7fr)] lg:items-start lg:gap-5">
            <div className="grid gap-4">
              <SectionCard title={t("workAdmin.sectionBasics")}>
                <Field label={t("workAdmin.fieldTitle")} htmlFor="task-title">
                  <Input
                    id="task-title"
                    autoFocus
                    className={inputClassName}
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
                    rows={4}
                    className="min-h-[110px] resize-y rounded-xl text-base leading-relaxed sm:min-h-[96px] sm:rounded-lg sm:text-sm"
                    value={taskForm.description}
                    onChange={(e) =>
                      setTaskForm((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </Field>
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">
                    {t("workMedia.title")}
                  </p>
                  <TaskMediaPicker
                    drafts={taskForm.mediaDrafts}
                    onChange={(mediaDrafts) =>
                      setTaskForm((p) => ({ ...p, mediaDrafts }))
                    }
                  />
                </div>
              </SectionCard>

              <SectionCard title={t("workAdmin.sectionSchedule")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("workAdmin.fieldDue")} htmlFor="task-due">
                    <DateTime12Field
                      id="task-due"
                      value={taskForm.dueDate}
                      onChange={(dueDate) =>
                        setTaskForm((p) => ({ ...p, dueDate }))
                      }
                      placeholder={t("dateTime.pick")}
                    />
                  </Field>
                  <Field label={t("workAdmin.fieldEstimate")} htmlFor="task-est">
                    <Input
                      id="task-est"
                      type="number"
                      min={0}
                      max={480}
                      className={inputClassName}
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

                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">
                    {t("workAdmin.fieldPriority")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["high", "medium", "low"] as const).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() =>
                          setTaskForm((p) => ({ ...p, priority }))
                        }
                        className={cn(
                          "h-10 touch-manipulation rounded-xl border px-2 text-[13px] font-semibold transition-colors sm:h-9",
                          taskForm.priority === priority
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/70 bg-muted/25 text-muted-foreground hover:bg-muted/45"
                        )}
                      >
                        {t(`ops.priority.${priority}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
                      className={inputClassName}
                      value={taskForm.tag}
                      onChange={(e) =>
                        setTaskForm((p) => ({ ...p, tag: e.target.value }))
                      }
                    />
                  </Field>
                  <Field
                    label={t("workAdmin.fieldRelatedMeeting")}
                    htmlFor="task-meet"
                    className="sm:col-span-2"
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
              </SectionCard>

              <SectionCard title={t("workAdmin.sectionAssignees")} className="lg:hidden">
                <EmployeeMultiPicker
                  employees={employees}
                  selectedIds={taskForm.assigneeIds}
                  onChange={(assigneeIds) =>
                    setTaskForm((p) => ({ ...p, assigneeIds }))
                  }
                  label={t("workAdmin.fieldAssignees")}
                  listClassName="max-h-[min(14rem,36vh)]"
                />
              </SectionCard>

              <SectionCard title={t("workAdmin.sectionMore")}>
                <Field label={t("workAdmin.fieldSubItems")} htmlFor="task-subs">
                  <Textarea
                    id="task-subs"
                    rows={3}
                    className="min-h-[80px] resize-y rounded-xl text-base sm:min-h-[72px] sm:rounded-lg sm:text-sm"
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
              </SectionCard>
            </div>

            <aside className="hidden gap-4 lg:sticky lg:top-0 lg:grid">
              <SectionCard title={t("workAdmin.sectionAssignees")}>
                <EmployeeMultiPicker
                  employees={employees}
                  selectedIds={taskForm.assigneeIds}
                  onChange={(assigneeIds) =>
                    setTaskForm((p) => ({ ...p, assigneeIds }))
                  }
                  label={t("workAdmin.fieldAssignees")}
                  listClassName="max-h-[min(22rem,48vh)]"
                />
              </SectionCard>

              {!isEditing && !hideOrganicAds ? (
                <SectionCard title={t("workAdmin.sectionOptions")}>
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
                        className={inputClassName}
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
                </SectionCard>
              ) : null}
            </aside>

            {!isEditing && !hideOrganicAds ? (
              <SectionCard title={t("workAdmin.sectionOptions")} className="lg:hidden">
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
                    htmlFor="task-ads-count-mobile"
                  >
                    <Input
                      id="task-ads-count-mobile"
                      type="number"
                      min={1}
                      max={ORGANIC_ADS_MAX_QUANTITY}
                      className={inputClassName}
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
              </SectionCard>
            ) : null}
          </div>
        </DialogBody>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/55 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:justify-between sm:px-5 sm:pb-5">
          <Button
            type="button"
            variant="outline"
            className="h-11 touch-manipulation rounded-xl sm:me-auto sm:h-9 sm:rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            {!isEditing ? (
              <Button
                type="button"
                variant="secondary"
                className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
                disabled={busy}
                onClick={() => onSave({ addAnother: true })}
              >
                {busy ? <Loader2 className="animate-spin" /> : null}
                {t("workAdmin.saveAndAddAnother")}
              </Button>
            ) : null}
            <Button
              type="button"
              className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
              disabled={busy}
              onClick={() => onSave()}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
