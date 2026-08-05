"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarPlus, ListPlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import { Badge } from "@/components/ui/badge";
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
import {
  createWorkMeeting,
  createWorkTask,
  deleteWorkMeeting,
  deleteWorkTask,
  updateWorkMeeting,
  updateWorkTask,
} from "@/services/work.service";
import { useTranslation } from "@/hooks/use-translation";
import { todayIsoDate } from "@/lib/work-utils";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  TaskPriority,
  WorkMeeting,
  WorkTask,
} from "@/types/work";

type ComposerMode = "task" | "meeting" | null;

interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  tag: string;
  estimateMin: number;
  subItemsText: string;
}

interface MeetingDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  participantIds: string[];
  agendaText: string;
  notes: string;
  joinUrl: string;
}

function emptyTaskDraft(): TaskDraft {
  return {
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 0,
    subItemsText: "",
  };
}

function emptyMeetingDraft(selfId: string): MeetingDraft {
  return {
    title: "",
    date: todayIsoDate(),
    startTime: "10:00",
    endTime: "11:00",
    location: "",
    participantIds: [selfId],
    agendaText: "",
    notes: "",
    joinUrl: "",
  };
}

function taskToDraft(task: WorkTask): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    tag: task.tag,
    estimateMin: task.estimateMin,
    subItemsText: task.subItems.map((s) => s.label).join("\n"),
  };
}

function meetingToDraft(meeting: WorkMeeting): MeetingDraft {
  return {
    title: meeting.title,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    participantIds: [...meeting.participantIds],
    agendaText: meeting.agenda.join("\n"),
    notes: meeting.notes,
    joinUrl: meeting.joinUrl ?? "",
  };
}

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

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
      dueDate: taskDraft.dueDate,
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

  return (
    <>
      <Dialog
        open={taskOpen}
        onOpenChange={(open) => onModeChange(open ? "task" : null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="icon-well h-8 w-8">
                <ListPlus className="h-4 w-4" aria-hidden />
              </span>
              {isEditingTask
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
                  type="date"
                  value={taskDraft.dueDate}
                  onChange={(e) =>
                    setTaskDraft((p) => ({ ...p, dueDate: e.target.value }))
                  }
                />
              </Field>
              <Field
                label={t("workAdmin.fieldEstimate")}
                htmlFor="emp-task-est"
              >
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
                      estimateMin: e.target.value
                        ? Number(e.target.value)
                        : 0,
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
              onClick={() => onModeChange(null)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void saveTask()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ListPlus className="h-4 w-4" />
              )}
              {isEditingTask ? t("common.save") : t("workHub.saveTask")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={meetingOpen}
        onOpenChange={(open) => onModeChange(open ? "meeting" : null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="icon-well h-8 w-8">
                <CalendarPlus className="h-4 w-4" aria-hidden />
              </span>
              {isEditingMeeting
                ? t("workHub.editPersonalMeeting")
                : t("workHub.addPersonalMeeting")}
            </DialogTitle>
            <DialogDescription>
              {t("workHub.meetingFormDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-sky-800 dark:text-sky-200">
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                {t("workHub.personalMeetingHint")}
              </p>
            </div>

            <Field
              label={t("workAdmin.fieldTitle")}
              htmlFor="emp-meet-title"
            >
              <Input
                id="emp-meet-title"
                value={meetingDraft.title}
                onChange={(e) =>
                  setMeetingDraft((p) => ({ ...p, title: e.target.value }))
                }
                placeholder={t("workHub.meetingTitlePlaceholder")}
                autoFocus
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("workAdmin.fieldDate")} htmlFor="emp-meet-date">
                <Input
                  id="emp-meet-date"
                  type="date"
                  value={meetingDraft.date}
                  onChange={(e) =>
                    setMeetingDraft((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </Field>
              <Field label={t("workAdmin.fieldStart")} htmlFor="emp-meet-start">
                <Input
                  id="emp-meet-start"
                  type="time"
                  value={meetingDraft.startTime}
                  onChange={(e) =>
                    setMeetingDraft((p) => ({
                      ...p,
                      startTime: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={t("workAdmin.fieldEnd")} htmlFor="emp-meet-end">
                <Input
                  id="emp-meet-end"
                  type="time"
                  value={meetingDraft.endTime}
                  onChange={(e) =>
                    setMeetingDraft((p) => ({ ...p, endTime: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label={t("workHub.location")} htmlFor="emp-meet-loc">
              <Input
                id="emp-meet-loc"
                value={meetingDraft.location}
                onChange={(e) =>
                  setMeetingDraft((p) => ({ ...p, location: e.target.value }))
                }
                placeholder={t("workHub.locationPlaceholder")}
              />
            </Field>

            <Field
              label={t("workAdmin.fieldJoinUrl")}
              htmlFor="emp-meet-url"
            >
              <Input
                id="emp-meet-url"
                type="url"
                value={meetingDraft.joinUrl}
                onChange={(e) =>
                  setMeetingDraft((p) => ({ ...p, joinUrl: e.target.value }))
                }
                placeholder="https://"
              />
            </Field>

            <EmployeeMultiPicker
              employees={peers}
              selectedIds={meetingDraft.participantIds}
              lockedIds={[selfId]}
              onChange={(ids) =>
                setMeetingDraft((p) => ({
                  ...p,
                  participantIds: Array.from(new Set([selfId, ...ids])),
                }))
              }
              label={t("workAdmin.fieldParticipants")}
            />

            <Field
              label={t("workHub.agenda")}
              htmlFor="emp-meet-agenda"
              hint={t("workAdmin.agendaHint")}
            >
              <Textarea
                id="emp-meet-agenda"
                value={meetingDraft.agendaText}
                onChange={(e) =>
                  setMeetingDraft((p) => ({
                    ...p,
                    agendaText: e.target.value,
                  }))
                }
                placeholder={t("workHub.agendaPlaceholder")}
                rows={3}
              />
            </Field>

            <Field label={t("workHub.notes")} htmlFor="emp-meet-notes">
              <Textarea
                id="emp-meet-notes"
                value={meetingDraft.notes}
                onChange={(e) =>
                  setMeetingDraft((p) => ({ ...p, notes: e.target.value }))
                }
                rows={2}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onModeChange(null)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void saveMeeting()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
              {isEditingMeeting
                ? t("common.save")
                : t("workHub.saveMeeting")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EmployeeComposerTriggers({
  onAddTask,
  onAddMeeting,
  className,
}: {
  onAddTask: () => void;
  onAddMeeting: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button type="button" size="sm" onClick={onAddTask} className="h-9">
        <ListPlus className="h-4 w-4" />
        {t("workHub.addPersonalTask")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onAddMeeting}
        className="h-9 border border-white/15 bg-white/10 text-white hover:bg-white/15"
      >
        <CalendarPlus className="h-4 w-4" />
        {t("workHub.addPersonalMeeting")}
      </Button>
    </div>
  );
}

export function OriginBadge({
  origin,
}: {
  origin?: WorkTask["origin"] | WorkMeeting["origin"];
}) {
  const { t } = useTranslation();
  const isPersonal = (origin ?? "assigned") === "personal";
  return (
    <Badge
      variant={isPersonal ? "secondary" : "info"}
      className="h-5 font-medium"
    >
      {isPersonal ? t("workHub.originPersonal") : t("workHub.originAssigned")}
    </Badge>
  );
}

export async function removePersonalWork(
  kind: "task" | "meeting",
  id: string
) {
  return kind === "task" ? deleteWorkTask(id) : deleteWorkMeeting(id);
}
