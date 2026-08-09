"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
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
import { Time12Input } from "@/components/ui/time-12-input";
import { Field } from "@/components/work/employee-work-composer-field";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { MeetingDraft } from "@/components/work/employee-work-composer-types";

export function EmployeeWorkMeetingComposerDialog({
  open,
  onOpenChange,
  isEditing,
  busy,
  meetingDraft,
  setMeetingDraft,
  peers,
  selfId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  busy: boolean;
  meetingDraft: MeetingDraft;
  setMeetingDraft: (updater: (prev: MeetingDraft) => MeetingDraft) => void;
  peers: Employee[];
  selfId: string;
  onSave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="icon-well h-8 w-8">
              <CalendarPlus className="h-4 w-4" aria-hidden />
            </span>
            {isEditing
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

          <Field label={t("workAdmin.fieldTitle")} htmlFor="emp-meet-title">
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

          <div className="grid gap-3">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("workAdmin.fieldStart")} htmlFor="emp-meet-start">
                <Time12Input
                  id="emp-meet-start"
                  value={meetingDraft.startTime}
                  onChange={(startTime) =>
                    setMeetingDraft((p) => ({ ...p, startTime }))
                  }
                  aria-label={t("workAdmin.fieldStart")}
                />
              </Field>
              <Field label={t("workAdmin.fieldEnd")} htmlFor="emp-meet-end">
                <Time12Input
                  id="emp-meet-end"
                  value={meetingDraft.endTime}
                  onChange={(endTime) =>
                    setMeetingDraft((p) => ({ ...p, endTime }))
                  }
                  aria-label={t("workAdmin.fieldEnd")}
                />
              </Field>
            </div>
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

          <Field label={t("workAdmin.fieldJoinUrl")} htmlFor="emp-meet-url">
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
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={onSave} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {isEditing ? t("common.save") : t("workHub.saveMeeting")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
