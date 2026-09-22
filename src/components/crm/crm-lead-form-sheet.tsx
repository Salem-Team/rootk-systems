"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CrmLeadFormFields } from "@/components/crm/crm-lead-form-fields";
import { CrmDuplicateLeadDialog } from "@/components/crm/crm-duplicate-lead-dialog";
import { useCrmLeadForm } from "@/hooks/use-crm-lead-form";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { CrmBusinessType, CrmLead, CrmStage } from "@/types/crm";

interface CrmLeadFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: CrmStage[];
  businessTypes?: CrmBusinessType[];
  employees: Employee[];
  editingLead?: CrmLead | null;
  canAssign?: boolean;
  defaultStageId?: string;
  recordType?: import("@/types/crm").CrmRecordType;
  onSaved?: (lead: CrmLead) => void;
  onOpenExistingLead?: (leadId: string) => void;
}

/** Add / edit lead sheet with zod-backed validation. */
export function CrmLeadFormSheet({
  open,
  onOpenChange,
  stages,
  businessTypes = [],
  employees,
  editingLead = null,
  canAssign = false,
  defaultStageId,
  recordType = "lead",
  onSaved,
  onOpenExistingLead,
}: CrmLeadFormSheetProps) {
  const form = useCrmLeadForm({
    open,
    stages,
    businessTypes,
    editingLead,
    canAssign,
    defaultStageId,
    recordType,
    onOpenChange,
    onSaved,
    onOpenExistingLead,
  });
  const { t } = form;
  const isCold =
    (editingLead?.recordType ?? recordType) === "cold_call";
  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={cn(
            "flex w-full max-w-none flex-col gap-0 overflow-hidden !p-0",
            "h-dvh max-h-dvh rounded-none",
            "sm:h-dvh sm:max-h-dvh sm:max-w-[min(40rem,calc(100vw-1.5rem))]",
            "lg:max-w-[min(52rem,calc(100vw-3rem))]"
          )}
        >
          <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] pe-14 sm:px-6 sm:pb-4 sm:pt-6 sm:pe-14">
            <SheetHeader className="space-y-1 text-start">
              <SheetTitle className="text-[1.1rem] sm:text-lg">
                {editingLead
                  ? t(
                      isCold
                        ? "crm.coldCalls.editTitle"
                        : "crm.leadForm.editTitle"
                    )
                  : t(
                      isCold ? "crm.coldCalls.addTitle" : "crm.leadForm.title"
                    )}
              </SheetTitle>
              <SheetDescription className="line-clamp-2 text-[13px] sm:line-clamp-none sm:text-sm">
                {t("crm.leadForm.description")}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3.5 py-4 sm:px-6 sm:py-5">
            <div className="mx-auto grid w-full min-w-0 max-w-3xl gap-4 pb-2">
              <CrmLeadFormFields
                name={form.name}
                onNameChange={form.setName}
                contacts={form.contacts}
                onPatchContact={form.patchContact}
                onAddContact={form.addContact}
                onRemoveContact={form.removeContact}
                canAddContact={form.canAddContact}
                email={form.email}
                onEmailChange={form.setEmail}
                companyName={form.companyName}
                onCompanyNameChange={form.setCompanyName}
                businessTypeId={form.businessTypeId}
                onBusinessTypeIdChange={form.setBusinessTypeId}
                activeBusinessTypes={form.activeBusinessTypes}
                source={form.source}
                onSourceChange={form.setSource}
                stageId={form.stageId}
                onStageIdChange={form.onStageIdChange}
                activeStages={form.activeStages}
                subStageId={form.subStageId}
                onSubStageIdChange={form.setSubStageId}
                activeSubStages={form.activeSubStages}
                ownerEmployeeId={form.ownerEmployeeId}
                onOwnerEmployeeIdChange={form.setOwnerEmployeeId}
                employees={safeEmployees}
                canAssign={form.canPickOwner}
                status={form.status}
                onStatusChange={form.setStatus}
                tags={form.tags}
                onToggleTag={form.toggleTag}
                nextAction={form.nextAction}
                onNextActionChange={form.setNextAction}
                nextFollowUpAt={form.nextFollowUpAt}
                onNextFollowUpAtChange={form.setNextFollowUpAt}
                request={form.request}
                onRequestChange={form.setRequest}
                budget={form.budget}
                onBudgetChange={form.setBudget}
                notes={form.notes}
                onNotesChange={form.setNotes}
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-border/60 bg-card/95 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 sm:py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 min-h-12 w-full touch-manipulation rounded-xl sm:h-10 sm:min-h-10 sm:w-auto sm:min-w-28 sm:rounded-lg"
                onClick={() => onOpenChange(false)}
              >
                {t("crm.actions.cancel")}
              </Button>
              <Button
                type="button"
                className="h-12 min-h-12 w-full touch-manipulation rounded-xl sm:h-10 sm:min-h-10 sm:w-auto sm:min-w-28 sm:rounded-lg"
                disabled={form.saving}
                onClick={() => void form.submit()}
              >
                {form.saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("crm.actions.save")
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <CrmDuplicateLeadDialog
        open={form.duplicateOpen}
        onOpenChange={form.setDuplicateOpen}
        lead={form.duplicateLead}
        ownedByOther={form.duplicateOwnedByOther}
        onOpenLead={form.onOpenExistingLead}
      />
    </>
  );
}
