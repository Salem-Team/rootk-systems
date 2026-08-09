"use client";

import { Input } from "@/components/ui/input";
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
import { NEXT_ACTIONS, SOURCES, STATUSES, TAGS } from "@/lib/crm/lead-form-options";
import type { Employee } from "@/types";
import type {
  CrmBusinessType,
  CrmLeadSource,
  CrmLeadStatus,
  CrmLeadTag,
  CrmNextAction,
  CrmStage,
} from "@/types/crm";

interface CrmLeadFormFieldsProps {
  name: string;
  onNameChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  businessTypeId: string;
  onBusinessTypeIdChange: (v: string) => void;
  activeBusinessTypes: CrmBusinessType[];
  source: CrmLeadSource;
  onSourceChange: (v: CrmLeadSource) => void;
  stageId: string;
  onStageIdChange: (v: string) => void;
  activeStages: CrmStage[];
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
  notes: string;
  onNotesChange: (v: string) => void;
}

/** All input fields for the CRM lead create/edit form. */
export function CrmLeadFormFields({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  companyName,
  onCompanyNameChange,
  businessTypeId,
  onBusinessTypeIdChange,
  activeBusinessTypes,
  source,
  onSourceChange,
  stageId,
  onStageIdChange,
  activeStages,
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
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-phone">{t("crm.leadForm.phone")}</Label>
        <Input
          id="crm-lead-phone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          inputMode="tel"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-email">{t("crm.leadForm.email")}</Label>
        <Input
          id="crm-lead-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-company">{t("crm.leadForm.company")}</Label>
        <Input
          id="crm-lead-company"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>{t("crm.leadForm.businessType")}</Label>
        <Select value={businessTypeId} onValueChange={onBusinessTypeIdChange}>
          <SelectTrigger>
            <SelectValue placeholder={t("crm.leadForm.selectBusinessType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {t("crm.leadForm.noBusinessType")}
            </SelectItem>
            {activeBusinessTypes.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>{t("crm.leadForm.source")}</Label>
          <Select value={source} onValueChange={(v) => onSourceChange(v as CrmLeadSource)}>
            <SelectTrigger>
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
            <SelectTrigger>
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
      </div>

      {canAssign ? (
        <div className="grid gap-1.5">
          <Label>{t("crm.leadForm.owner")}</Label>
          <Select value={ownerEmployeeId} onValueChange={onOwnerEmployeeIdChange}>
            <SelectTrigger>
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
          <SelectTrigger>
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
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                className={
                  on
                    ? "rounded-md border border-primary/25 bg-primary/[0.08] px-2 py-1 text-[12px] font-medium text-primary"
                    : "rounded-md border border-border/70 px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted/50"
                }
                aria-pressed={on}
              >
                {t(`crm.tags.${tag}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>{t("crm.leadForm.nextAction")}</Label>
          <Select
            value={nextAction}
            onValueChange={(v) => onNextActionChange(v as CrmNextAction)}
          >
            <SelectTrigger>
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
          <Label htmlFor="crm-lead-follow">{t("crm.leadForm.nextFollowUp")}</Label>
          <Input
            id="crm-lead-follow"
            type="datetime-local"
            value={nextFollowUpAt}
            onChange={(e) => onNextFollowUpAtChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="crm-lead-notes">{t("crm.leadForm.notes")}</Label>
        <Textarea
          id="crm-lead-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
        />
      </div>
    </>
  );
}
