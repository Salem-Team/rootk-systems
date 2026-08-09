"use client";

import { ListPlus, Loader2, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/work/employee-work-composer-field";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TaskDraft } from "@/components/work/employee-work-composer-types";

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="icon-well h-8 w-8">
              <ListPlus className="h-4 w-4" aria-hidden />
            </span>
            {isEditing
              ? t("workHub.editPersonalTask")
              : t("workHub.addPersonalTask")}
          </DialogTitle>
          <DialogDescription>{t("workHub.taskFormDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("workHub.personalHint")}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {t("workHub.personalTaskHint")}
            </p>
          </div>

          <Field label={t("workAdmin.fieldTitle")} htmlFor="emp-task-title">
            <Input
              id="emp-task-title"
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
              value={taskDraft.description}
              onChange={(e) =>
                setTaskDraft((p) => ({ ...p, description: e.target.value }))
              }
              placeholder={t("workHub.taskDescPlaceholder")}
              rows={3}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("workAdmin.fieldDue")} htmlFor="emp-task-due">
              <Input
                id="emp-task-due"
                type="datetime-local"
                step={60}
                value={taskDraft.dueDate}
                onChange={(e) =>
                  setTaskDraft((p) => ({ ...p, dueDate: e.target.value }))
                }
              />
            </Field>
            <Field label={t("workAdmin.fieldEstimate")} htmlFor="emp-task-est">
              <Input
                id="emp-task-est"
                type="number"
                min={0}
                max={480}
                step={5}
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
            <div className="flex flex-wrap gap-1.5">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setTaskDraft((prev) => ({ ...prev, priority: p }))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
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
              value={taskDraft.tag}
              onChange={(e) =>
                setTaskDraft((p) => ({ ...p, tag: e.target.value }))
              }
              placeholder={t("workHub.tagPlaceholder")}
            />
          </Field>

          <Field
            label={t("workAdmin.fieldSubItems")}
            htmlFor="emp-task-subs"
            hint={t("workAdmin.subItemsHint")}
          >
            <Textarea
              id="emp-task-subs"
              value={taskDraft.subItemsText}
              onChange={(e) =>
                setTaskDraft((p) => ({ ...p, subItemsText: e.target.value }))
              }
              placeholder={t("workHub.subItemsPlaceholder")}
              rows={3}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={onSave} disabled={busy}>
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
