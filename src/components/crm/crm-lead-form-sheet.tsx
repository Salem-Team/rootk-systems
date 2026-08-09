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
import { useCrmLeadForm } from "@/hooks/use-crm-lead-form";
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
  onSaved?: (lead: CrmLead) => void;
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
  onSaved,
}: CrmLeadFormSheetProps) {
  const form = useCrmLeadForm({
    open,
    stages,
    businessTypes,
    editingLead,
    defaultStageId,
    onOpenChange,
    onSaved,
  });
  const { t } = form;
  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {editingLead ? t("crm.leadForm.editTitle") : t("crm.leadForm.title")}
          </SheetTitle>
          <SheetDescription>{t("crm.leadForm.description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-4">
          <CrmLeadFormFields
            name={form.name}
            onNameChange={form.setName}
            phone={form.phone}
            onPhoneChange={form.setPhone}
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
            onStageIdChange={form.setStageId}
            activeStages={form.activeStages}
            ownerEmployeeId={form.ownerEmployeeId}
            onOwnerEmployeeIdChange={form.setOwnerEmployeeId}
            employees={safeEmployees}
            canAssign={canAssign}
            status={form.status}
            onStatusChange={form.setStatus}
            tags={form.tags}
            onToggleTag={form.toggleTag}
            nextAction={form.nextAction}
            onNextActionChange={form.setNextAction}
            nextFollowUpAt={form.nextFollowUpAt}
            onNextFollowUpAtChange={form.setNextFollowUpAt}
            notes={form.notes}
            onNotesChange={form.setNotes}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("crm.actions.cancel")}
            </Button>
            <Button type="button" disabled={form.saving} onClick={() => void form.submit()}>
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
  );
}
