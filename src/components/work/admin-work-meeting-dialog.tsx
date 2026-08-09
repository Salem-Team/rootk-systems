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
import { Time12Input } from "@/components/ui/time-12-input";
import { Field } from "@/components/work/admin-work-field";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { MeetingFormState } from "@/components/work/admin-work-panel-types";

export function AdminWorkMeetingDialog({
  open,
  onOpenChange,
  isEditing,
  busy,
  meetingForm,
  setMeetingForm,
  employees,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  busy: boolean;
  meetingForm: MeetingFormState;
  setMeetingForm: (updater: (prev: MeetingFormState) => MeetingFormState) => void;
  employees: Employee[];
  onSave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("workAdmin.editMeeting") : t("workAdmin.addMeeting")}
          </DialogTitle>
          <DialogDescription>
            {t("workAdmin.meetingFormDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <Field label={t("workAdmin.fieldTitle")} htmlFor="meet-title">
            <Input
              id="meet-title"
              value={meetingForm.title}
              onChange={(e) =>
                setMeetingForm((p) => ({ ...p, title: e.target.value }))
              }
            />
          </Field>
          <div className="grid gap-3">
            <Field label={t("workAdmin.fieldDate")} htmlFor="meet-date">
              <Input
                id="meet-date"
                type="date"
                value={meetingForm.date}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("workAdmin.fieldStart")} htmlFor="meet-start">
                <Time12Input
                  id="meet-start"
                  value={meetingForm.startTime}
                  onChange={(startTime) =>
                    setMeetingForm((p) => ({ ...p, startTime }))
                  }
                  aria-label={t("workAdmin.fieldStart")}
                />
              </Field>
              <Field label={t("workAdmin.fieldEnd")} htmlFor="meet-end">
                <Time12Input
                  id="meet-end"
                  value={meetingForm.endTime}
                  onChange={(endTime) =>
                    setMeetingForm((p) => ({ ...p, endTime }))
                  }
                  aria-label={t("workAdmin.fieldEnd")}
                />
              </Field>
            </div>
          </div>
          <Field label={t("workHub.location")} htmlFor="meet-loc">
            <Input
              id="meet-loc"
              value={meetingForm.location}
              onChange={(e) =>
                setMeetingForm((p) => ({ ...p, location: e.target.value }))
              }
            />
          </Field>
          <Field label={t("workHub.organizer")} htmlFor="meet-org">
            <select
              id="meet-org"
              className="flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 text-sm"
              value={meetingForm.organizerId}
              onChange={(e) => {
                const organizerId = e.target.value;
                setMeetingForm((p) => ({
                  ...p,
                  organizerId,
                  participantIds: p.participantIds.includes(organizerId)
                    ? p.participantIds
                    : [...p.participantIds, organizerId],
                }));
              }}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </Field>
          <EmployeeMultiPicker
            employees={employees}
            selectedIds={meetingForm.participantIds}
            onChange={(participantIds) =>
              setMeetingForm((p) => ({ ...p, participantIds }))
            }
            label={t("workAdmin.fieldParticipants")}
          />
          <Field label={t("workHub.agenda")} htmlFor="meet-agenda">
            <Textarea
              id="meet-agenda"
              placeholder={t("workAdmin.agendaHint")}
              value={meetingForm.agendaText}
              onChange={(e) =>
                setMeetingForm((p) => ({
                  ...p,
                  agendaText: e.target.value,
                }))
              }
            />
          </Field>
          <Field label={t("workHub.notes")} htmlFor="meet-notes">
            <Textarea
              id="meet-notes"
              value={meetingForm.notes}
              onChange={(e) =>
                setMeetingForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </Field>
          <Field label={t("workAdmin.fieldJoinUrl")} htmlFor="meet-url">
            <Input
              id="meet-url"
              type="url"
              placeholder="https://"
              value={meetingForm.joinUrl}
              onChange={(e) =>
                setMeetingForm((p) => ({ ...p, joinUrl: e.target.value }))
              }
            />
          </Field>
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
