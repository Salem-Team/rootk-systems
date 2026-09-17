"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Wallet, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { updateCrmLead } from "@/services/crm.service";
import type { CrmLead } from "@/types/crm";

/** Quick request + budget editor on the lead sheet overview. */
export function CrmLeadRequestBudgetEditor({
  lead,
  onSaved,
  className,
}: {
  lead: CrmLead;
  onSaved?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [request, setRequest] = useState(lead.request ?? "");
  const [budget, setBudget] = useState(lead.budget ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRequest(lead.request ?? "");
    setBudget(lead.budget ?? "");
  }, [lead.id, lead.request, lead.budget]);

  const dirty =
    request.trim() !== (lead.request ?? "").trim() ||
    budget.trim() !== (lead.budget ?? "").trim();

  async function save() {
    setSaving(true);
    const res = await updateCrmLead(lead.id, {
      request: request.trim(),
      budget: budget.trim(),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.leadUpdated"));
    onSaved?.();
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.04] sm:rounded-xl",
        className
      )}
    >
      <div className="border-b border-primary/15 px-3.5 py-3 sm:px-4 sm:py-2.5">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-primary sm:text-[13px]">
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
          {t("crm.leadForm.requestBudgetSection")}
        </h3>
        <p className="mt-1 hidden text-[12px] leading-relaxed text-muted-foreground sm:block">
          {t("crm.leadSheet.requestBudgetHint")}
        </p>
      </div>

      <div className="grid gap-3.5 p-3.5 sm:gap-3 sm:p-4">
        <div className="grid gap-1.5">
          <Label
            htmlFor={`crm-rb-request-${lead.id}`}
            className="text-[13px] font-medium"
          >
            {t("crm.leadForm.request")}
          </Label>
          <Textarea
            id={`crm-rb-request-${lead.id}`}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={4}
            placeholder={t("crm.leadForm.requestPlaceholder")}
            className="min-h-[7rem] rounded-xl text-base leading-relaxed sm:min-h-[5.5rem] sm:rounded-lg sm:text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor={`crm-rb-budget-${lead.id}`}
            className="flex items-center gap-1.5 text-[13px] font-medium"
          >
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {t("crm.leadForm.budget")}
          </Label>
          <Input
            id={`crm-rb-budget-${lead.id}`}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder={t("crm.leadForm.budgetPlaceholder")}
            className="h-12 rounded-xl text-base sm:h-10 sm:rounded-lg sm:text-sm"
            enterKeyHint="done"
          />
        </div>

        <Button
          type="button"
          size="sm"
          className={cn(
            "h-12 min-h-12 w-full touch-manipulation rounded-xl text-[0.95rem] sm:h-10 sm:min-h-10 sm:rounded-lg sm:text-sm",
            !dirty && "opacity-60"
          )}
          disabled={!dirty || saving}
          onClick={() => void save()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("crm.leadSheet.saveRequestBudget")}
        </Button>
      </div>
    </section>
  );
}
