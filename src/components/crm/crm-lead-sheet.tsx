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
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-lg sm:p-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
            <SheetHeader className="shrink-0 pe-8 text-start sm:pe-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="truncate text-[1.1rem] sm:text-lg">
                    {lead?.name ?? "…"}
                  </SheetTitle>
                  <SheetDescription asChild>
                    <div className="mt-1">
                      <div className="mt-1">
                        {lead ? <CrmLeadContactList lead={lead} /> : null}
                      </div>
                    </div>
                  </SheetDescription>
                </div>
                {sheet.stage ? (
                  <Badge
                    variant="outline"
                    className="shrink-0"
                    style={{
                      borderColor: `${sheet.stage.color}55`,
                      color: sheet.stage.color,
                    }}
                  >
                    {sheet.stage.name}
                  </Badge>
                ) : null}
              </div>
              <p className="text-[12px] text-muted-foreground">{sheet.ownerName}</p>
            </SheetHeader>

            {sheet.loading && !lead ? (
              <div className="flex min-h-0 flex-1 items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : lead ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
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
                      className="h-11 min-h-11 touch-manipulation rounded-xl sm:h-9 sm:min-h-9 sm:rounded-lg"
                      onClick={() => onEdit(lead)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("crm.actions.editLead")}
                    </Button>
                  ) : null}
                  <Select value={lead.stageId} onValueChange={sheet.changeStage}>
                    <SelectTrigger
                      className={
                        onEdit
                          ? "h-11 min-h-11 w-full touch-manipulation rounded-xl text-base sm:h-9 sm:min-h-9 sm:w-[150px] sm:rounded-lg sm:text-sm"
                          : "col-span-2 h-11 min-h-11 w-full touch-manipulation rounded-xl text-base sm:col-auto sm:h-9 sm:min-h-9 sm:w-[150px] sm:rounded-lg sm:text-sm"
                      }
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
