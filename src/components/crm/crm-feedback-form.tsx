"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { Check, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { appendLossReasonNote } from "@/lib/crm/loss-reason";
import { NEXT_ACTIONS, TAGS, toLocalInput } from "@/lib/crm/lead-form-options";
import type { MentionableUser } from "@/lib/mentions";
import { resolveAccountFullName } from "@/lib/user-display-name";
import { cn } from "@/lib/utils";
import { addCrmLeadFeedback, updateCrmLead } from "@/services/crm.service";
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
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors active:scale-[0.98] sm:min-h-10 sm:rounded-lg sm:py-2 sm:font-medium",
        tone === "danger" &&
          (active
            ? "border-destructive/55 bg-destructive text-destructive-foreground shadow-sm"
            : "border-destructive/25 bg-destructive/[0.04] text-destructive hover:bg-destructive/10"),
        tone === "success" &&
          (active
            ? "border-emerald-500/55 bg-emerald-600 text-white shadow-sm"
            : "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"),
        tone === "default" &&
          (active
            ? "border-primary/45 bg-primary text-primary-foreground shadow-sm"
            : "border-border/70 bg-card text-muted-foreground hover:bg-muted/55 hover:text-foreground"),
        className
      )}
    >
      {children}
    </button>
  );
}

function StagePickButton({
  stage,
  active,
  onClick,
}: {
  stage: CrmStage;
  active: boolean;
  onClick: () => void;
}) {
  const isLost = stage.category === "lost";
  const isWon = stage.category === "won";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-12 touch-manipulation items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-colors active:scale-[0.98] sm:min-h-11",
        active && isLost && "border-destructive/50 bg-destructive/10 shadow-sm",
        active && isWon && "border-emerald-500/45 bg-emerald-500/10 shadow-sm",
        active &&
          !isLost &&
          !isWon &&
          "border-primary/45 bg-primary/10 shadow-sm",
        !active &&
          "border-border/70 bg-card hover:bg-muted/45 hover:border-border"
      )}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
        style={{ backgroundColor: stage.color }}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {stage.name}
      </span>
      {active ? (
        <Check
          className={cn(
            "h-4 w-4 shrink-0",
            isLost && "text-destructive",
            isWon && "text-emerald-600 dark:text-emerald-400",
            !isLost && !isWon && "text-primary"
          )}
          aria-hidden
        />
      ) : null}
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
  const [lossReasonDetails, setLossReasonDetails] = useState("");
  const [request, setRequest] = useState("");
  const [budget, setBudget] = useState("");
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

  /** All pipeline stages — always keep won/lost visible even if inactive. */
  const selectableStages = useMemo(() => {
    const list = Array.isArray(stages) ? [...stages] : [];
    return list
      .filter(
        (s) =>
          s.active ||
          s.id === lead?.stageId ||
          s.category === "lost" ||
          s.category === "won"
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [stages, lead?.stageId]);

  const lossReasons = useMemo(
    () =>
      (Array.isArray(feedbackTypes) ? feedbackTypes : [])
        .filter((ft) => ft.active && ft.isLossReason)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [feedbackTypes]
  );

  const selectedStage = selectableStages.find((s) => s.id === stageId);
  const needsLossReason = selectedStage?.category === "lost";
  const selfUserId = getSessionUserId();
  const needsSchedule = !needsLossReason && nextAction !== "none";

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
    setLossReasonDetails("");
    setRequest(lead.request ?? "");
    setBudget(lead.budget ?? "");
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

  function selectStage(next: CrmStage) {
    setStageId(next.id);
    if (next.category === "lost") {
      setNextAction("none");
      setNextFollowUpAt("");
      return;
    }
    setLossReasonTypeId("");
    setLossReasonDetails("");
    setNextAction((prev) => (prev === "none" ? "follow_up" : prev));
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

    const reasonName =
      lossReasons.find((r) => r.id === lossReasonTypeId)?.name ?? "Lost";
    const resolvedNextAction: CrmNextAction = needsLossReason
      ? "none"
      : nextAction;
    const detailsTrim = lossReasonDetails.trim();

    setSaving(true);
    const res = await addCrmLeadFeedback(lead.id, {
      feedbackTypeId: needsLossReason ? lossReasonTypeId : undefined,
      customerFeedback,
      callAnswered,
      stageId,
      tags,
      nextAction: resolvedNextAction,
      nextFollowUpAt:
        resolvedNextAction === "none" || !nextFollowUpAt
          ? null
          : new Date(nextFollowUpAt).toISOString(),
      meetingMode: resolvedNextAction === "meeting" ? meetingMode : null,
      meetingLocation:
        resolvedNextAction === "meeting" && meetingMode === "offline"
          ? meetingLocation
          : null,
      notes: needsLossReason && detailsTrim ? detailsTrim : "",
      mentionedUserIds: mentionedUsers.map((user) => user.id),
    });

    if (!res.success) {
      setSaving(false);
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }

    const nextNotes =
      needsLossReason && detailsTrim
        ? appendLossReasonNote(lead.notes ?? "", reasonName, detailsTrim)
        : undefined;
    const requestTrim = request.trim();
    const budgetTrim = budget.trim();
    const requestDirty = requestTrim !== (lead.request ?? "").trim();
    const budgetDirty = budgetTrim !== (lead.budget ?? "").trim();

    if (nextNotes !== undefined || requestDirty || budgetDirty) {
      const patch = await updateCrmLead(lead.id, {
        ...(nextNotes !== undefined ? { notes: nextNotes } : {}),
        ...(requestDirty ? { request: requestTrim } : {}),
        ...(budgetDirty ? { budget: budgetTrim } : {}),
      });
      if (!patch.success) {
        setSaving(false);
        toast.error(patch.message ?? t("crm.errors.saveFailed"));
        return;
      }
    }

    setSaving(false);
    toast.success(t("crm.toast.feedbackAdded"));
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          // Mobile: near-full sheet, 90% width floating panel feel
          "inset-x-[5%] bottom-[max(0.5rem,env(safe-area-inset-bottom))] max-h-[min(94dvh,100%)] w-[90%] max-w-none",
          "rounded-[1.35rem] rounded-b-[1.35rem]",
          "px-0 pb-0 pt-0",
          // Desktop / tablet
          "sm:inset-x-auto sm:bottom-auto sm:w-[min(90vw,42rem)] sm:max-w-[min(90vw,42rem)] sm:max-h-[min(92dvh,960px)] sm:rounded-2xl sm:p-0"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/50 px-4 pb-3 pt-1 sm:px-5 sm:pb-3.5 sm:pt-1">
          <DialogTitle>{t("crm.feedback.formTitle")}</DialogTitle>
          <DialogDescription className="line-clamp-2 text-[13px] leading-relaxed sm:line-clamp-none sm:text-sm">
            {t("crm.feedback.formDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-5 px-4 py-4 sm:gap-5 sm:px-5 sm:py-4">
          <section className="grid gap-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:text-[13px] sm:normal-case sm:tracking-tight sm:text-foreground">
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

            <div className="grid gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-3 sm:rounded-xl sm:p-3.5">
              <div className="grid gap-1.5">
                <Label htmlFor="crm-fb-request">
                  {t("crm.leadForm.request")}
                </Label>
                <Textarea
                  id="crm-fb-request"
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder={t("crm.leadForm.requestPlaceholder")}
                  rows={2}
                  className="min-h-[72px] resize-y text-[15px] sm:min-h-[64px] sm:text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="crm-fb-budget">{t("crm.leadForm.budget")}</Label>
                <Input
                  id="crm-fb-budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={t("crm.leadForm.budgetPlaceholder")}
                  className="h-12 touch-manipulation text-base sm:h-10 sm:text-sm"
                />
              </div>
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
            <div className="flex items-end justify-between gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:text-[13px] sm:normal-case sm:tracking-tight sm:text-foreground">
                {t("crm.feedback.sectionAction")}
              </h3>
              <span className="text-[11px] text-muted-foreground sm:text-[12px]">
                {t("crm.feedback.pickStage")}
              </span>
            </div>

            <div className="grid gap-2">
              <Label>{t("crm.feedback.newStage")}</Label>
              {selectableStages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-[13px] text-muted-foreground">
                  {t("crm.leadForm.selectStage")}
                </p>
              ) : (
                <div className="grid max-h-[min(42dvh,280px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pe-0.5 sm:max-h-none sm:grid-cols-3">
                  {selectableStages.map((s) => (
                    <StagePickButton
                      key={s.id}
                      stage={s}
                      active={stageId === s.id}
                      onClick={() => selectStage(s)}
                    />
                  ))}
                </div>
              )}
            </div>

            {needsLossReason ? (
              <div className="grid gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-3.5 sm:rounded-xl">
                <div className="grid gap-1">
                  <p className="text-[13px] font-semibold text-destructive">
                    {t("crm.feedback.sectionLost")}
                  </p>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {selectedStage
                      ? t("crm.lossReason.descWithStage", {
                          stage: selectedStage.name,
                        })
                      : t("crm.lossReason.desc")}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>{t("crm.lossReason.select")}</Label>
                  {lossReasons.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      {t("crm.lossReason.empty")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {lossReasons.map((reason) => (
                        <ChoiceChip
                          key={reason.id}
                          active={lossReasonTypeId === reason.id}
                          tone="danger"
                          onClick={() => setLossReasonTypeId(reason.id)}
                          className="w-full justify-start text-start"
                        >
                          {reason.name}
                        </ChoiceChip>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="crm-fb-loss-details">
                    {t("crm.lossReason.details")}
                  </Label>
                  <Textarea
                    id="crm-fb-loss-details"
                    value={lossReasonDetails}
                    onChange={(e) => setLossReasonDetails(e.target.value)}
                    placeholder={t("crm.lossReason.detailsPlaceholder")}
                    rows={3}
                    className="min-h-[88px] resize-y text-[15px] sm:text-sm"
                  />
                </div>
              </div>
            ) : null}

            {!needsLossReason ? (
              <>
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
              </>
            ) : (
              <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                {t("crm.feedback.lostNoFollowUp")}
              </p>
            )}
          </section>

          <section className="grid gap-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:text-[13px] sm:normal-case sm:tracking-tight sm:text-foreground">
              {t("crm.feedback.sectionFeedback")}
            </h3>
            <div className="grid gap-2">
              <Label>{t("crm.feedback.callStatus")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceChip
                  active={callAnswered}
                  tone="success"
                  onClick={() => setCallAnswered(true)}
                  className="min-h-11 w-full justify-center"
                >
                  {t("crm.feedback.answered")}
                </ChoiceChip>
                <ChoiceChip
                  active={!callAnswered}
                  tone="danger"
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

        <DialogFooter className="shrink-0 gap-2 border-border/50 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 sm:gap-2 sm:px-5 sm:pb-4 [&_button]:min-h-12 [&_button]:touch-manipulation [&_button]:rounded-xl sm:[&_button]:min-h-10 sm:[&_button]:rounded-lg">
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
            className={cn(
              "w-full sm:w-auto",
              needsLossReason &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
            disabled={saving || !lead}
            onClick={() => void submit()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : needsLossReason ? (
              t("crm.lossReason.confirm")
            ) : (
              t("crm.actions.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
