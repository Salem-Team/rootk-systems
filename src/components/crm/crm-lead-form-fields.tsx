"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CrmDateTimeField } from "@/components/crm/crm-datetime-field";
import { CrmRequestBudgetFields } from "@/components/crm/crm-request-budget-fields";
import { Textarea } from "@/components/ui/textarea";
import { CrmIntlPhoneInput } from "@/components/crm/crm-intl-phone-input";
import { useTranslation } from "@/hooks/use-translation";
import { CRM_CONTACT_KINDS } from "@/lib/crm/contact-identity";
import { businessTypeLabel } from "@/lib/crm/business-type-label";
import { NEXT_ACTIONS, SOURCES, STATUSES, TAGS } from "@/lib/crm/lead-form-options";
import type { LeadFormContactDraft } from "@/lib/crm/lead-contacts";
import type { Employee } from "@/types";
import type {
  CrmBusinessType,
  CrmContactKind,
  CrmLeadSource,
  CrmLeadStatus,
  CrmLeadTag,
  CrmNextAction,
  CrmStage,
  CrmSubStage,
} from "@/types/crm";

interface CrmLeadFormFieldsProps {
  name: string;
  onNameChange: (v: string) => void;
  contacts: LeadFormContactDraft[];
  onPatchContact: (
    id: string,
    patch: Partial<Pick<LeadFormContactDraft, "kind" | "value" | "country">>
  ) => void;
  onAddContact: () => void;
  onRemoveContact: (id: string) => void;
  canAddContact: boolean;
  email: string;
  onEmailChange: (v: string) => void;
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  companyLocation: string;
  onCompanyLocationChange: (v: string) => void;
  businessTypeId: string;
  onBusinessTypeIdChange: (v: string) => void;
  activeBusinessTypes: CrmBusinessType[];
  source: CrmLeadSource;
  onSourceChange: (v: CrmLeadSource) => void;
  stageId: string;
  onStageIdChange: (v: string) => void;
  activeStages: CrmStage[];
  subStageId: string;
  onSubStageIdChange: (v: string) => void;
  activeSubStages: CrmSubStage[];
  ownerEmployeeId: string;
  onOwnerEmployeeIdChange: (v: string) => void;
  employees: Employee[];
  canAssign: boolean;
  status: CrmLeadStatus;
  onStatusChange: (v: CrmLeadStatus) => void;
  tags: CrmLeadTag[];
  onToggleTag: (tag: CrmLeadTag) => void;
  nextAction: CrmNextAction;
  onNextActionChange: (v: CrmNextAction) => void;
  nextFollowUpAt: string;
  onNextFollowUpAtChange: (v: string) => void;
  request: string;
  onRequestChange: (v: string) => void;
  budget: string;
  onBudgetChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}

/** All input fields for the CRM lead create/edit form. */
export function CrmLeadFormFields({
  name,
  onNameChange,
  contacts,
  onPatchContact,
  onAddContact,
  onRemoveContact,
  canAddContact,
  email,
  onEmailChange,
  companyName,
  onCompanyNameChange,
  companyLocation,
  onCompanyLocationChange,
  businessTypeId,
  onBusinessTypeIdChange,
  activeBusinessTypes,
  source,
  onSourceChange,
  stageId,
  onStageIdChange,
  activeStages,
  subStageId,
  onSubStageIdChange,
  activeSubStages,
  ownerEmployeeId,
  onOwnerEmployeeIdChange,
  employees,
  canAssign,
  status,
  onStatusChange,
  tags,
  onToggleTag,
  nextAction,
  onNextActionChange,
  nextFollowUpAt,
  onNextFollowUpAtChange,
  request,
  onRequestChange,
  budget,
  onBudgetChange,
  notes,
  onNotesChange,
}: CrmLeadFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-name">{t("crm.leadForm.name")}</Label>
        <Input
          id="crm-lead-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
          className="h-11 w-full min-w-0 text-base sm:h-9 sm:text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>{t("crm.leadForm.contact")}</Label>
        <div className="grid gap-2">
          {contacts.map((row, index) => (
            <div key={row.id} className="grid gap-1">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <Select
                  value={row.kind}
                  onValueChange={(v) =>
                    onPatchContact(row.id, { kind: v as CrmContactKind })
                  }
                >
                  <SelectTrigger className="h-11 w-full shrink-0 touch-manipulation text-base sm:h-11 sm:w-[9.25rem] sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRM_CONTACT_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {t(`crm.contactKind.${kind}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
                  {row.kind === "phone" ? (
                    <CrmIntlPhoneInput
                      id={index === 0 ? "crm-lead-phone" : undefined}
                      value={row.value}
                      country={row.country || "EG"}
                      onChange={(value) => onPatchContact(row.id, { value })}
                      onCountryChange={(next) =>
                        onPatchContact(row.id, { country: next })
                      }
                      className="min-w-0 w-full flex-1"
                    />
                  ) : (
                    <Input
                      id={index === 0 ? "crm-lead-phone" : undefined}
                      dir="ltr"
                      className="h-11 min-w-0 flex-1 text-base sm:text-sm"
                      value={row.value}
                      onChange={(e) =>
                        onPatchContact(row.id, { value: e.target.value })
                      }
                      placeholder={t("crm.leadForm.handlePlaceholder")}
                      autoComplete="username"
                    />
                  )}
                  {contacts.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      onClick={() => onRemoveContact(row.id)}
                      aria-label={t("crm.leadForm.removeContact")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        {canAddContact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 w-full touch-manipulation sm:h-9 sm:w-fit"
            onClick={onAddContact}
          >
            <Plus className="h-4 w-4" />
            {t("crm.leadForm.addContact")}
          </Button>
        ) : null}
        <p className="text-[12px] text-muted-foreground">
          {t("crm.leadForm.phoneHint")}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {t("crm.leadForm.contactsHint")}
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-email">{t("crm.leadForm.email")}</Label>
        <Input
          id="crm-lead-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="h-11 w-full min-w-0 text-base sm:h-9 sm:text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-company">{t("crm.leadForm.company")}</Label>
        <Input
          id="crm-lead-company"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          className="h-11 w-full min-w-0 text-base sm:h-9 sm:text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-company-location">
          {t("crm.leadForm.companyLocation")}
        </Label>
        <Input
          id="crm-lead-company-location"
          value={companyLocation}
          onChange={(e) => onCompanyLocationChange(e.target.value)}
          placeholder={t("crm.leadForm.companyLocationPlaceholder")}
          className="h-11 w-full min-w-0 text-base sm:h-9 sm:text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>{t("crm.leadForm.businessType")}</Label>
        <Select value={businessTypeId} onValueChange={onBusinessTypeIdChange}>
          <SelectTrigger className="h-11 w-full min-w-0 touch-manipulation text-base sm:h-9 sm:text-sm">
            <SelectValue placeholder={t("crm.leadForm.selectBusinessType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {t("crm.leadForm.noBusinessType")}
            </SelectItem>
            {activeBusinessTypes.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {businessTypeLabel(b.name, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>{t("crm.leadForm.source")}</Label>
          <Select value={source} onValueChange={(v) => onSourceChange(v as CrmLeadSource)}>
            <SelectTrigger className="h-11 touch-manipulation text-base sm:h-9 sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`crm.source.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>{t("crm.leadForm.stage")}</Label>
          <Select
            value={stageId || undefined}
            onValueChange={onStageIdChange}
            disabled={activeStages.length === 0}
          >
            <SelectTrigger className="h-11 touch-manipulation text-base sm:h-9 sm:text-sm">
              <SelectValue placeholder={t("crm.leadForm.selectStage")} />
            </SelectTrigger>
            <SelectContent>
              {activeStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 md:col-span-2">
          <Label>{t("crm.leadForm.subStage")}</Label>
          <Select
            value={subStageId}
            onValueChange={onSubStageIdChange}
            disabled={!stageId || activeSubStages.length === 0}
          >
            <SelectTrigger className="h-11 touch-manipulation text-base sm:h-9 sm:text-sm">
              <SelectValue placeholder={t("crm.leadForm.selectSubStage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t("crm.leadForm.noSubStage")}
              </SelectItem>
              {activeSubStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canAssign ? (
        <div className="grid gap-1.5">
          <Label>{t("crm.leadForm.owner")}</Label>
          <Select value={ownerEmployeeId} onValueChange={onOwnerEmployeeIdChange}>
            <SelectTrigger className="h-11 w-full min-w-0 touch-manipulation text-base sm:h-9 sm:text-sm">
              <SelectValue placeholder={t("crm.leadForm.selectOwner")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("crm.leads.unassigned")}</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <Label>{t("crm.leadForm.status")}</Label>
        <Select value={status} onValueChange={(v) => onStatusChange(v as CrmLeadStatus)}>
          <SelectTrigger className="h-11 touch-manipulation text-base sm:h-9 sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`crm.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label>{t("crm.leadForm.tags")}</Label>
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-1.5">
          {TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                aria-pressed={on}
                className={
                  on
                    ? "min-h-11 touch-manipulation rounded-xl border border-primary/25 bg-primary/[0.08] px-3 py-2 text-[13px] font-semibold text-primary sm:min-h-0 sm:rounded-md sm:px-2 sm:py-1 sm:text-[12px] sm:font-medium"
                    : "min-h-11 touch-manipulation rounded-xl border border-border/70 px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted/50 sm:min-h-0 sm:rounded-md sm:px-2 sm:py-1 sm:text-[12px]"
                }
              >
                {t(`crm.tags.${tag}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5">
        <div className="grid min-w-0 gap-1.5">
          <Label className="text-[13px] leading-snug sm:text-sm">
            {t("crm.leadForm.nextAction")}
          </Label>
          <Select
            value={nextAction}
            onValueChange={(v) => onNextActionChange(v as CrmNextAction)}
          >
            <SelectTrigger className="h-10 min-w-0 touch-manipulation sm:h-9">
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
        <CrmDateTimeField
          id="crm-lead-follow"
          label={t("crm.leadForm.nextFollowUp")}
          value={nextFollowUpAt}
          onChange={onNextFollowUpAtChange}
        />
      </div>

      <div className="grid gap-3.5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-3.5 sm:gap-3 sm:rounded-xl sm:p-3.5">
        <div>
          <p className="text-[13px] font-semibold text-primary sm:text-[12px]">
            {t("crm.leadForm.requestBudgetSection")}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {t("crm.leadSheet.requestBudgetHint")}
          </p>
        </div>
        <CrmRequestBudgetFields
          request={request}
          budget={budget}
          onRequestChange={onRequestChange}
          onBudgetChange={onBudgetChange}
          notesId="crm-lead-request-notes"
          budgetId="crm-lead-budget"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-notes">{t("crm.leadForm.notes")}</Label>
        <Textarea
          id="crm-lead-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          className="min-h-[5.5rem] rounded-xl text-base sm:min-h-[96px] sm:rounded-lg sm:text-sm"
        />
      </div>
    </>
  );
}
