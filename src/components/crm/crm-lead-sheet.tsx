"use client";

import { Loader2, Pencil } from "lucide-react";
import { CrmFeedbackForm } from "@/components/crm/crm-feedback-form";
import { CrmLeadSheetTabs } from "@/components/crm/crm-lead-sheet-tabs";
import { CrmPhoneActions } from "@/components/crm/crm-phone-actions";
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
    stages,
    employees,
    feedbackTypes,
    onChanged,
  });
  const { t, lead } = sheet;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
          <SheetHeader className="shrink-0">
            <div className="flex items-start justify-between gap-3 pe-6">
              <div className="min-w-0">
                <SheetTitle className="truncate">{lead?.name ?? "…"}</SheetTitle>
                <SheetDescription asChild>
                  <div className="mt-1">
                    <CrmPhoneActions
                      phone={lead?.phone ?? ""}
                      phoneNormalized={lead?.phoneNormalized}
                      leadId={lead?.id}
                      leadName={lead?.name}
                      className="text-[12px]"
                    />
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
              <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => sheet.setFeedbackOpen(true)}
                >
                  {t("crm.actions.addFeedback")}
                </Button>
                {onEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(lead)}
                  >
                    <Pencil className="me-1.5 h-3.5 w-3.5" />
                    {t("crm.actions.editLead")}
                  </Button>
                ) : null}
                <Select value={lead.stageId} onValueChange={sheet.changeStage}>
                  <SelectTrigger className="h-8 w-full min-w-0 sm:w-[150px]">
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
              />
            </div>
          ) : (
            <EmptyState className="mt-8" title={t("crm.errors.loadFailed")} />
          )}
        </SheetContent>
      </Sheet>

      <CrmFeedbackForm
        open={sheet.feedbackOpen}
        onOpenChange={sheet.setFeedbackOpen}
        lead={lead}
        stages={stages}
        onSaved={() => {
          void sheet.reload();
          onChanged?.();
        }}
      />
    </>
  );
}
