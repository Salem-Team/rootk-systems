"use client";

import { ListPlus, Loader2, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTime12Field } from "@/components/shared/datetime-12-field";
import { Field } from "@/components/work/employee-work-composer-field";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TaskDraft } from "@/components/work/employee-work-composer-types";

const inputClassName = "h-11 rounded-xl text-base sm:h-9 sm:rounded-lg sm:text-sm";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function EmployeeWorkTaskComposerDialog({
  open,
  onOpenChange,
  isEditing,
  busy,
  taskDraft,
  setTaskDraft,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  busy: boolean;
  taskDraft: TaskDraft;
  setTaskDraft: (updater: (prev: TaskDraft) => TaskDraft) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="flex max-h-[min(94dvh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg sm:p-0">
        <DialogHeader className="shrink-0 border-b border-border/55 px-4 pb-3.5 pt-1 sm:px-5 sm:pt-5">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="icon-well h-9 w-9 shrink-0">
              <ListPlus className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              {isEditing
                ? t("workHub.editPersonalTask")
                : t("workHub.addPersonalTask")}
            </span>
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {t("workHub.taskFormDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-3.5 py-3 sm:rounded-xl">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("workHub.personalHint")}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {t("workHub.personalTaskHint")}
            </p>
          </div>

          <section className="grid gap-3">
            <SectionLabel>{t("workAdmin.sectionBasics")}</SectionLabel>
            <Field label={t("workAdmin.fieldTitle")} htmlFor="emp-task-title">
              <Input
                id="emp-task-title"
                className={inputClassName}
                value={taskDraft.title}
                onChange={(e) =>
                  setTaskDraft((p) => ({ ...p, title: e.target.value }))
                }
                placeholder={t("workHub.taskTitlePlaceholder")}
                autoFocus
              />
            </Field>
            <Field label={t("common.description")} htmlFor="emp-task-desc">
              <Textarea
                id="emp-task-desc"
                className="min-h-[88px] resize-y rounded-xl text-base leading-relaxed sm:min-h-[76px] sm:rounded-lg sm:text-sm"
                value={taskDraft.description}
                onChange={(e) =>
                  setTaskDraft((p) => ({ ...p, description: e.target.value }))
                }
                placeholder={t("workHub.taskDescPlaceholder")}
                rows={3}
              />
            </Field>
          </section>

          <section className="grid gap-3">
            <SectionLabel>{t("workAdmin.sectionSchedule")}</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("workAdmin.fieldDue")} htmlFor="emp-task-due">
                <DateTime12Field
                  id="emp-task-due"
                  value={taskDraft.dueDate}
                  onChange={(dueDate) =>
                    setTaskDraft((p) => ({ ...p, dueDate }))
                  }
                  placeholder={t("dateTime.pick")}
                />
              </Field>
              <Field label={t("workAdmin.fieldEstimate")} htmlFor="emp-task-est">
                <Input
                  id="emp-task-est"
                  type="number"
                  min={0}
                  max={480}
                  step={5}
                  className={inputClassName}
                  value={taskDraft.estimateMin || ""}
                  placeholder="—"
                  onChange={(e) =>
                    setTaskDraft((p) => ({
                      ...p,
                      estimateMin: e.target.value ? Number(e.target.value) : 0,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="space-y-2">
              <Label>{t("workAdmin.fieldPriority")}</Label>
              <div className="flex flex-wrap gap-2">
                {(["high", "medium", "low"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setTaskDraft((prev) => ({ ...prev, priority: p }))
                    }
                    className={cn(
                      "h-10 min-w-[5.5rem] flex-1 touch-manipulation rounded-xl border px-3 text-[13px] font-semibold transition-colors sm:h-9 sm:flex-none sm:rounded-full",
                      taskDraft.priority === p
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {t(`ops.priority.${p}`)}
                  </button>
                ))}
              </div>
            </div>

            <Field label={t("workAdmin.fieldTag")} htmlFor="emp-task-tag">
              <Input
                id="emp-task-tag"
                className={inputClassName}
                value={taskDraft.tag}
                onChange={(e) =>
                  setTaskDraft((p) => ({ ...p, tag: e.target.value }))
                }
                placeholder={t("workHub.tagPlaceholder")}
              />
            </Field>
          </section>

          <section className="grid gap-3">
            <SectionLabel>{t("workAdmin.sectionMore")}</SectionLabel>
            <Field
              label={t("workAdmin.fieldSubItems")}
              htmlFor="emp-task-subs"
              hint={t("workAdmin.subItemsHint")}
            >
              <Textarea
                id="emp-task-subs"
                className="min-h-[80px] resize-y rounded-xl text-base sm:min-h-[72px] sm:rounded-lg sm:text-sm"
                value={taskDraft.subItemsText}
                onChange={(e) =>
                  setTaskDraft((p) => ({ ...p, subItemsText: e.target.value }))
                }
                placeholder={t("workHub.subItemsPlaceholder")}
                rows={3}
              />
            </Field>
          </section>
        </DialogBody>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/55 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5">
          <Button
            type="button"
            variant="outline"
            className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
            onClick={onSave}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListPlus className="h-4 w-4" />
            )}
            {isEditing ? t("common.save") : t("workHub.saveTask")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
