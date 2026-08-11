"use client";

import { useMemo, useState } from "react";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { TAGS } from "@/lib/crm/lead-form-options";
import { cn } from "@/lib/utils";
import { addCrmLeadFeedback } from "@/services/crm.service";
import type { CrmLead, CrmLeadTag, CrmStage } from "@/types/crm";

interface CrmFeedbackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CrmLead | null;
  stages: CrmStage[];
  onSaved?: () => void;
}

/** Primary feedback dialog: lead+tags → stage → feedback + answered toggle. */
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
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [callAnswered, setCallAnswered] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeStages = useMemo(
    () =>
      (Array.isArray(stages) ? stages : []).filter(
        (s) => s.active || s.id === lead?.stageId
      ),
    [stages, lead?.stageId]
  );

  useHydrateOnOpen(open, lead?.id, () => {
    if (!lead) return;
    setTags([...(lead.tags ?? [])]);
    setStageId(lead.stageId);
    setCustomerFeedback("");
    setCallAnswered(true);
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
      nextAction: callAnswered ? "follow_up" : "call",
      notes: "",
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
              <Textarea
                id="crm-fb-text"
                value={customerFeedback}
                onChange={(e) => setCustomerFeedback(e.target.value)}
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
