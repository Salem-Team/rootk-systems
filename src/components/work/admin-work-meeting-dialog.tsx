"use client";

import { Loader2 } from "lucide-react";
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
import { Time12Input } from "@/components/ui/time-12-input";
import { Field } from "@/components/work/admin-work-field";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { MeetingFormState } from "@/components/work/admin-work-panel-types";

const inputClassName =
  "h-11 rounded-xl text-base touch-manipulation sm:h-9 sm:rounded-lg sm:text-sm";

const selectClassName = cn(
  "flex h-11 w-full rounded-xl border border-border/85 bg-card px-3 text-base touch-manipulation sm:h-9 sm:rounded-lg sm:text-sm",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-border focus-visible:border-primary/45 focus-visible:outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-ring/18"
);

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
      <DialogContent className="flex max-h-[min(94dvh,720px)] w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-lg sm:p-0">
        <DialogHeader className="shrink-0 border-b border-border/55 px-4 pb-3.5 pt-1 sm:px-5 sm:pt-5">
          <DialogTitle>
            {isEditing ? t("workAdmin.editMeeting") : t("workAdmin.addMeeting")}
          </DialogTitle>
          <DialogDescription>
            {t("workAdmin.meetingFormDesc")}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-3.5">
            <Field label={t("workAdmin.fieldTitle")} htmlFor="meet-title">
              <Input
                id="meet-title"
                className={inputClassName}
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
                  className={inputClassName}
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
                className={inputClassName}
                value={meetingForm.location}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, location: e.target.value }))
                }
              />
            </Field>
            <Field label={t("workHub.organizer")} htmlFor="meet-org">
              <select
                id="meet-org"
                className={selectClassName}
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
              listClassName="max-h-[min(12rem,32vh)]"
            />
            <Field label={t("workHub.agenda")} htmlFor="meet-agenda">
              <Textarea
                id="meet-agenda"
                className="min-h-[80px] resize-y rounded-xl text-base sm:min-h-[72px] sm:rounded-lg sm:text-sm"
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
                className="min-h-[72px] resize-y rounded-xl text-base sm:rounded-lg sm:text-sm"
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
                className={inputClassName}
                placeholder="https://"
                value={meetingForm.joinUrl}
                onChange={(e) =>
                  setMeetingForm((p) => ({ ...p, joinUrl: e.target.value }))
                }
              />
            </Field>
          </div>
        </DialogBody>
        <DialogFooter className="shrink-0 gap-2 border-t border-border/55 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5">
          <Button
            type="button"
            variant="outline"
            className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="h-11 touch-manipulation rounded-xl sm:h-9 sm:rounded-lg"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
