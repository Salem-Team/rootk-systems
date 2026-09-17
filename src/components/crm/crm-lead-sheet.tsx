"use client";

import { Loader2, MessageSquarePlus, Pencil } from "lucide-react";
import { CrmFeedbackForm } from "@/components/crm/crm-feedback-form";
import { CrmLeadSheetTabs } from "@/components/crm/crm-lead-sheet-tabs";
import { CrmLeadContactList } from "@/components/crm/crm-lead-contact-list";
import { CrmLossReasonDialog } from "@/components/crm/crm-loss-reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { useCrmLeadSheet } from "@/hooks/use-crm-lead-sheet";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  CrmBusinessType,
  CrmFeedbackType,
  CrmLead,
  CrmStage,
} from "@/types/crm";

interface CrmLeadSheetProps {
  leadId: string | null;
  open: boolean;
  initialTab?: string;
  onOpenChange: (open: boolean) => void;
  stages: CrmStage[];
  employees: Employee[];
  feedbackTypes: CrmFeedbackType[];
  businessTypes?: CrmBusinessType[];
  onEdit?: (lead: CrmLead) => void;
  onChanged?: () => void;
}

/** Lead detail sheet — Feedback is the primary action. */
export function CrmLeadSheet({
  leadId,
  open,
  initialTab = "overview",
  onOpenChange,
  stages,
  employees,
  feedbackTypes,
  businessTypes = [],
  onEdit,
  onChanged,
}: CrmLeadSheetProps) {
  const sheet = useCrmLeadSheet({
    leadId,
    open,
    initialTab,
    stages,
    employees,
    feedbackTypes,
    onChanged,
  });
  const { t, lead } = sheet;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={cn(
            "flex w-full flex-col gap-0 overflow-hidden p-0",
            "max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none",
            "sm:max-w-lg"
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border/60 bg-card/95 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6 sm:pb-4 sm:pt-6">
              <SheetHeader className="space-y-1 pe-10 text-start sm:pe-12">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="truncate text-[1.15rem] leading-snug sm:text-lg">
                      {lead?.name ?? "…"}
                    </SheetTitle>
                    <SheetDescription asChild>
                      <div className="mt-1.5">
                        {lead ? (
                          <CrmLeadContactList
                            lead={lead}
                            className="text-[13px]"
                          />
                        ) : null}
                      </div>
                    </SheetDescription>
                  </div>
                  {sheet.stage ? (
                    <Badge
                      variant="outline"
                      className="mt-0.5 max-w-[7.5rem] shrink-0 truncate rounded-full px-2.5 py-1 text-[11px]"
                      style={{
                        borderColor: `${sheet.stage.color}55`,
                        color: sheet.stage.color,
                      }}
                    >
                      {sheet.stage.name}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-[12px] text-muted-foreground">
                  {sheet.ownerName}
                </p>
              </SheetHeader>

              {lead ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
                  <Button
                    type="button"
                    className="col-span-2 hidden h-9 min-h-9 touch-manipulation rounded-lg text-sm sm:inline-flex"
                    onClick={() => sheet.setFeedbackOpen(true)}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    {t("crm.actions.addFeedback")}
                  </Button>
                  {onEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-h-11 touch-manipulation rounded-xl text-[13px] sm:h-9 sm:min-h-9 sm:rounded-lg sm:text-sm"
                      onClick={() => onEdit(lead)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="truncate">{t("crm.actions.editLead")}</span>
                    </Button>
                  ) : null}
                  <Select value={lead.stageId} onValueChange={sheet.changeStage}>
                    <SelectTrigger
                      className={cn(
                        "h-11 min-h-11 w-full touch-manipulation rounded-xl text-base sm:h-9 sm:min-h-9 sm:w-[160px] sm:rounded-lg sm:text-sm",
                        !onEdit && "col-span-2"
                      )}
                    >
                      <SelectValue placeholder={t("crm.actions.changeStage")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sheet.safeStages
                        .filter((s) => s.active || s.id === lead.stageId)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {sheet.loading && !lead ? (
              <div className="flex min-h-0 flex-1 items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : lead ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 sm:px-6">
                <CrmLeadSheetTabs
                  tab={sheet.tab}
                  onTabChange={sheet.setTab}
                  lead={lead}
                  timeline={sheet.timeline}
                  feedback={sheet.feedback}
                  businessTypes={businessTypes}
                  employees={employees}
                  lossReasonName={sheet.lossReasonName}
                  stageCategory={sheet.stage?.category}
                  onRequestBudgetSaved={() => {
                    void sheet.reload();
                    onChanged?.();
                  }}
                />
              </div>
            ) : (
              <EmptyState className="mt-8" title={t("crm.errors.loadFailed")} />
            )}
          </div>

          {lead ? (
            <div className="shrink-0 border-t border-border/60 bg-card/95 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
              <Button
                type="button"
                className="h-12 w-full touch-manipulation rounded-xl text-[0.95rem]"
                onClick={() => sheet.setFeedbackOpen(true)}
              >
                <MessageSquarePlus className="h-4 w-4" />
                {t("crm.actions.addFeedback")}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <CrmFeedbackForm
        open={sheet.feedbackOpen}
        onOpenChange={sheet.setFeedbackOpen}
        lead={lead}
        stages={stages}
        feedbackTypes={feedbackTypes}
        onSaved={() => {
          void sheet.reload();
          onChanged?.();
        }}
      />

      <CrmLossReasonDialog
        open={sheet.lossReasonOpen}
        onOpenChange={(next) => {
          sheet.setLossReasonOpen(next);
          if (!next) sheet.setPendingLostStageId(null);
        }}
        lossReasons={sheet.lossReasons}
        stageName={sheet.pendingLostStage?.name}
        saving={sheet.saving}
        onConfirm={sheet.confirmLossReason}
      />
    </>
  );
}
