"use client";

import { useEffect, useMemo, useState } from "react";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CrmMentionTextarea } from "@/components/crm/crm-mention-textarea";
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
  onSaved?: () => void;
}

/** Primary feedback dialog: lead+tags → stage/next-action → feedback. */
export function CrmFeedbackForm({
  open,
  onOpenChange,
  lead,
  stages,
  onSaved,
}: CrmFeedbackFormProps) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<CrmLeadTag[]>([]);
  const [stageId, setStageId] = useState("");
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
  const selfUserId = getSessionUserId();

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
    setSaving(true);
    const res = await addCrmLeadFeedback(lead.id, {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("crm.feedback.formTitle")}</DialogTitle>
          <DialogDescription>{t("crm.feedback.formDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <section className="grid gap-2.5">
            <h3 className="text-[13px] font-semibold tracking-tight">
              {t("crm.feedback.sectionLead")}
            </h3>
            <div className="rounded-lg border border-border/70 px-3 py-2.5">
              <p className="text-sm font-semibold">{lead?.name ?? "—"}</p>
              <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                {lead?.phone ?? "—"}
              </p>
              {lead?.companyName ? (
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {lead.companyName}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>{t("crm.leadForm.tags")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        on
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border/70 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {t(`crm.tags.${tag}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-2.5">
            <h3 className="text-[13px] font-semibold tracking-tight">
              {t("crm.feedback.sectionAction")}
            </h3>
            <div className="grid gap-1.5">
              <Label htmlFor="crm-fb-stage">{t("crm.feedback.newStage")}</Label>
              <Select
                value={stageId || undefined}
                onValueChange={setStageId}
                disabled={activeStages.length === 0}
              >
                <SelectTrigger id="crm-fb-stage">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="crm-fb-next-action">
                  {t("crm.feedback.nextAction")}
                </Label>
                <Select
                  value={nextAction}
                  onValueChange={(v) => setNextAction(v as CrmNextAction)}
                >
                  <SelectTrigger id="crm-fb-next-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEXT_ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {t(`crm.nextAction.${a}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="crm-fb-next-at">
                  {t("crm.feedback.nextFollowUp")}
                </Label>
                <Input
                  id="crm-fb-next-at"
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("crm.feedback.nextActionHint")}
            </p>
            {nextAction === "meeting" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>{t("crm.feedback.meetingMode")}</Label>
                  <Select
                    value={meetingMode}
                    onValueChange={(v) => setMeetingMode(v as CrmMeetingMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        {t("crm.feedback.meetingOnline")}
                      </SelectItem>
                      <SelectItem value="offline">
                        {t("crm.feedback.meetingOffline")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {meetingMode === "offline" ? (
                  <div className="grid gap-1.5">
                    <Label>{t("crm.feedback.meetingLocation")}</Label>
                    <Select
                      value={meetingLocation}
                      onValueChange={(v) =>
                        setMeetingLocation(v as CrmMeetingLocation)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="our_company">
                          {t("crm.feedback.locationOurCompany")}
                        </SelectItem>
                        <SelectItem value="client_company">
                          {t("crm.feedback.locationClientCompany")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="grid gap-2.5">
            <h3 className="text-[13px] font-semibold tracking-tight">
              {t("crm.feedback.sectionFeedback")}
            </h3>
            <div className="grid gap-1.5">
              <Label>{t("crm.feedback.callStatus")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={callAnswered ? "default" : "outline"}
                  onClick={() => setCallAnswered(true)}
                >
                  {t("crm.feedback.answered")}
                  {callAnswered ? (
                    <Badge variant="secondary" className="ms-1.5 text-[10px]">
                      {t("crm.feedback.activeCall")}
                    </Badge>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  variant={!callAnswered ? "default" : "outline"}
                  onClick={() => setCallAnswered(false)}
                >
                  {t("crm.feedback.noAnswer")}
                  {!callAnswered ? (
                    <Badge variant="secondary" className="ms-1.5 text-[10px]">
                      {t("crm.feedback.inactiveCall")}
                    </Badge>
                  ) : null}
                </Button>
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
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("crm.actions.cancel")}
          </Button>
          <Button type="button" disabled={saving || !lead} onClick={() => void submit()}>
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
