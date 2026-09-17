"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CrmDateTimeField } from "@/components/crm/crm-datetime-field";
import { CrmMentionTextarea } from "@/components/crm/crm-mention-textarea";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import { NEXT_ACTIONS, TAGS, toLocalInput } from "@/lib/crm/lead-form-options";
import type { MentionableUser } from "@/lib/mentions";
import { resolveAccountFullName } from "@/lib/user-display-name";
import { cn } from "@/lib/utils";
import { addCrmLeadFeedback } from "@/services/crm.service";
import { getUsers } from "@/services/user.service";
import { getSessionUserId } from "@/stores/session-store";
import type {
  CrmFeedbackType,
  CrmLead,
  CrmLeadTag,
  CrmMeetingLocation,
  CrmMeetingMode,
  CrmNextAction,
  CrmStage,
} from "@/types/crm";

interface CrmFeedbackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CrmLead | null;
  stages: CrmStage[];
  feedbackTypes?: CrmFeedbackType[];
  onSaved?: () => void;
}

function ChoiceChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors active:scale-[0.98] sm:min-h-10 sm:rounded-lg sm:py-2 sm:font-medium",
        active
          ? "border-primary/45 bg-primary text-primary-foreground shadow-sm"
          : "border-border/70 bg-card text-muted-foreground hover:bg-muted/55 hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Primary feedback dialog: lead+tags → stage/next-action → feedback. */
export function CrmFeedbackForm({
  open,
  onOpenChange,
  lead,
  stages,
  feedbackTypes = [],
  onSaved,
}: CrmFeedbackFormProps) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<CrmLeadTag[]>([]);
  const [stageId, setStageId] = useState("");
  const [lossReasonTypeId, setLossReasonTypeId] = useState("");
  const [nextAction, setNextAction] = useState<CrmNextAction>("follow_up");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [mentionUsers, setMentionUsers] = useState<MentionableUser[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<MentionableUser[]>([]);
  const [callAnswered, setCallAnswered] = useState(true);
  const [meetingMode, setMeetingMode] = useState<CrmMeetingMode>("online");
  const [meetingLocation, setMeetingLocation] =
    useState<CrmMeetingLocation>("our_company");
  const [saving, setSaving] = useState(false);

  const activeStages = useMemo(
    () =>
      (Array.isArray(stages) ? stages : []).filter(
        (s) => s.active || s.id === lead?.stageId
      ),
    [stages, lead?.stageId]
  );
  const lossReasons = useMemo(
    () =>
      (Array.isArray(feedbackTypes) ? feedbackTypes : []).filter(
        (ft) => ft.active && ft.isLossReason
      ),
    [feedbackTypes]
  );
  const selectedStage = activeStages.find((s) => s.id === stageId);
  const needsLossReason = selectedStage?.category === "lost";
  const selfUserId = getSessionUserId();
  const needsSchedule = nextAction !== "none";

  useEffect(() => {
    if (!open) return;
    void getUsers().then((res) => {
      if (!res.success || !Array.isArray(res.data)) return;
      setMentionUsers(
        res.data
          .filter((user) => user.isActive !== false)
          .map((user) => {
            const name =
              resolveAccountFullName(user) || user.email.split("@")[0];
            return {
              id: user.id,
              name,
              email: user.email,
              initials: (user.initials || name.slice(0, 2)).toUpperCase(),
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    });
  }, [open]);

  useHydrateOnOpen(open, lead?.id, () => {
    if (!lead) return;
    setTags([...(lead.tags ?? [])]);
    setStageId(lead.stageId);
    setLossReasonTypeId(lead.lossReasonTypeId ?? "");
    setNextAction(lead.nextAction === "none" ? "follow_up" : lead.nextAction);
    setNextFollowUpAt(toLocalInput(lead.nextFollowUpAt));
    setCustomerFeedback("");
    setMentionedUsers([]);
    setCallAnswered(true);
    setMeetingMode("online");
    setMeetingLocation("our_company");
    setSaving(false);
  });

  function toggleTag(tag: CrmLeadTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  }

  async function submit() {
    if (!lead) return;
    if (!stageId) {
      toast.error(t("crm.leadForm.selectStage"));
      return;
    }
    if (needsLossReason && !lossReasonTypeId) {
      toast.error(t("crm.lossReason.required"));
      return;
    }
    setSaving(true);
    const res = await addCrmLeadFeedback(lead.id, {
      feedbackTypeId: needsLossReason ? lossReasonTypeId : undefined,
      customerFeedback,
      callAnswered,
      stageId,
      tags,
      nextAction,
      nextFollowUpAt: nextFollowUpAt
        ? new Date(nextFollowUpAt).toISOString()
        : null,
      meetingMode: nextAction === "meeting" ? meetingMode : null,
      meetingLocation:
        nextAction === "meeting" && meetingMode === "offline"
          ? meetingLocation
          : null,
      notes: "",
      mentionedUserIds: mentionedUsers.map((user) => user.id),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.feedbackAdded"));
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,920px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border/50 pb-3">
          <DialogTitle>{t("crm.feedback.formTitle")}</DialogTitle>
          <DialogDescription className="line-clamp-2 sm:line-clamp-none">
            {t("crm.feedback.formDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4 py-3.5 sm:gap-5 sm:py-4">
          <section className="grid gap-3">
            <h3 className="text-[13px] font-semibold tracking-tight">
              {t("crm.feedback.sectionLead")}
            </h3>
            <div className="rounded-2xl border border-border/70 bg-muted/25 px-3.5 py-3.5 sm:rounded-xl sm:py-3">
              <p className="text-[0.95rem] font-semibold sm:text-sm">
                {lead?.name ?? "—"}
              </p>
              <p
                className="mt-0.5 font-mono text-[13px] text-muted-foreground sm:text-[12px]"
                dir="ltr"
              >
                {lead?.phone ?? "—"}
              </p>
              {lead?.companyName ? (
                <p className="mt-0.5 text-[13px] text-muted-foreground sm:text-[12px]">
                  {lead.companyName}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>{t("crm.leadForm.tags")}</Label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {TAGS.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <ChoiceChip
                      key={tag}
                      active={on}
                      onClick={() => toggleTag(tag)}
                      className="w-full sm:w-auto"
                    >
                      {t(`crm.tags.${tag}`)}
                    </ChoiceChip>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-[13px] font-semibold tracking-tight">
              {t("crm.feedback.sectionAction")}
            </h3>
            <div className="grid gap-1.5">
              <Label htmlFor="crm-fb-stage">{t("crm.feedback.newStage")}</Label>
              <Select
                value={stageId || undefined}
                onValueChange={(value) => {
                  setStageId(value);
                  const next = activeStages.find((s) => s.id === value);
                  if (next?.category !== "lost") setLossReasonTypeId("");
                }}
                disabled={activeStages.length === 0}
              >
                <SelectTrigger
                  id="crm-fb-stage"
                  className="h-12 touch-manipulation text-base sm:h-10 sm:text-sm"
                >
                  <SelectValue placeholder={t("crm.leadForm.selectStage")} />
                </SelectTrigger>
                <SelectContent>
                  {activeStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                          aria-hidden
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsLossReason ? (
              <div className="grid gap-1.5">
                <Label htmlFor="crm-fb-loss-reason">
                  {t("crm.lossReason.select")}
                </Label>
                <Select
                  value={lossReasonTypeId || undefined}
                  onValueChange={setLossReasonTypeId}
                  disabled={lossReasons.length === 0}
                >
                  <SelectTrigger
                    id="crm-fb-loss-reason"
                    className="h-12 touch-manipulation text-base sm:h-10 sm:text-sm"
                  >
                    <SelectValue
                      placeholder={t("crm.lossReason.placeholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {lossReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>{t("crm.feedback.nextAction")}</Label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {NEXT_ACTIONS.map((action) => (
                  <ChoiceChip
                    key={action}
                    active={nextAction === action}
                    onClick={() => setNextAction(action)}
                    className="w-full sm:w-auto"
                  >
                    {t(`crm.nextAction.${action}`)}
                  </ChoiceChip>
                ))}
              </div>
            </div>

            {needsSchedule ? (
              <div className="grid gap-2">
                <CrmDateTimeField
                  id="crm-fb-next-at"
                  label={t("crm.feedback.nextFollowUp")}
                  value={nextFollowUpAt}
                  onChange={setNextFollowUpAt}
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-[12px]">
                  {t("crm.feedback.nextActionHint")}
                </p>
              </div>
            ) : null}

            {nextAction === "meeting" ? (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>{t("crm.feedback.meetingMode")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceChip
                      active={meetingMode === "online"}
                      onClick={() => setMeetingMode("online")}
                      className="w-full justify-center"
                    >
                      {t("crm.feedback.meetingOnline")}
                    </ChoiceChip>
                    <ChoiceChip
                      active={meetingMode === "offline"}
                      onClick={() => setMeetingMode("offline")}
                      className="w-full justify-center"
                    >
                      {t("crm.feedback.meetingOffline")}
                    </ChoiceChip>
                  </div>
                </div>
                {meetingMode === "offline" ? (
                  <div className="grid gap-2">
                    <Label>{t("crm.feedback.meetingLocation")}</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <ChoiceChip
                        active={meetingLocation === "our_company"}
                        onClick={() => setMeetingLocation("our_company")}
                        className="w-full justify-center"
                      >
                        {t("crm.feedback.locationOurCompany")}
                      </ChoiceChip>
                      <ChoiceChip
                        active={meetingLocation === "client_company"}
                        onClick={() => setMeetingLocation("client_company")}
                        className="w-full justify-center"
                      >
                        {t("crm.feedback.locationClientCompany")}
                      </ChoiceChip>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="grid gap-3">
            <h3 className="text-[13px] font-semibold tracking-tight">
              {t("crm.feedback.sectionFeedback")}
            </h3>
            <div className="grid gap-2">
              <Label>{t("crm.feedback.callStatus")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceChip
                  active={callAnswered}
                  onClick={() => setCallAnswered(true)}
                  className="min-h-11 w-full justify-center"
                >
                  {t("crm.feedback.answered")}
                </ChoiceChip>
                <ChoiceChip
                  active={!callAnswered}
                  onClick={() => setCallAnswered(false)}
                  className="min-h-11 w-full justify-center"
                >
                  {t("crm.feedback.noAnswer")}
                </ChoiceChip>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="crm-fb-text">
                {t("crm.feedback.customerFeedback")}
              </Label>
              <CrmMentionTextarea
                id="crm-fb-text"
                value={customerFeedback}
                onChange={setCustomerFeedback}
                users={mentionUsers}
                mentionedUsers={mentionedUsers}
                onMentionedUsersChange={setMentionedUsers}
                selfUserId={selfUserId}
                rows={4}
                placeholder={t("crm.feedback.feedbackPlaceholder")}
              />
            </div>
          </section>
        </DialogBody>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2 [&_button]:min-h-12 [&_button]:touch-manipulation [&_button]:rounded-xl sm:[&_button]:min-h-10 sm:[&_button]:rounded-lg">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            {t("crm.actions.cancel")}
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={saving || !lead}
            onClick={() => void submit()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("crm.actions.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
