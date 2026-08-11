import { useState } from "react";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { toLocalInput } from "@/lib/crm/lead-form-options";
import { createLeadSchema } from "@/schemas/crm.schema";
import { createCrmLead, updateCrmLead } from "@/services/crm.service";
import type {
  CrmBusinessType,
  CrmLead,
  CrmLeadSource,
  CrmLeadStatus,
  CrmLeadTag,
  CrmNextAction,
  CrmStage,
} from "@/types/crm";

interface UseCrmLeadFormArgs {
  open: boolean;
  stages: CrmStage[];
  businessTypes?: CrmBusinessType[];
  editingLead?: CrmLead | null;
  defaultStageId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved?: (lead: CrmLead) => void;
}

export function useCrmLeadForm({
  open,
  stages,
  businessTypes = [],
  editingLead = null,
  defaultStageId,
  onOpenChange,
  onSaved,
}: UseCrmLeadFormArgs) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessTypeId, setBusinessTypeId] = useState<string>("none");
  const [source, setSource] = useState<CrmLeadSource>("other");
  const [stageId, setStageId] = useState("");
  const [subStageId, setSubStageId] = useState<string>("none");
  const [ownerEmployeeId, setOwnerEmployeeId] = useState<string>("none");
  const [status, setStatus] = useState<CrmLeadStatus>("active");
  const [tags, setTags] = useState<CrmLeadTag[]>([]);
  const [nextAction, setNextAction] = useState<CrmNextAction>("none");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const safeStages = Array.isArray(stages) ? stages : [];
  const activeStages = safeStages.filter(
    (s) => s.active || s.id === editingLead?.stageId
  );
  const safeBusinessTypes = Array.isArray(businessTypes) ? businessTypes : [];
  const activeBusinessTypes = safeBusinessTypes.filter(
    (b) => b.active || b.id === editingLead?.businessTypeId
  );

  useHydrateOnOpen(open, editingLead?.id ?? "create", () => {
    if (editingLead) {
      setName(editingLead.name);
      setPhone(editingLead.phone);
      setEmail(editingLead.email ?? "");
      setCompanyName(editingLead.companyName ?? "");
      setBusinessTypeId(editingLead.businessTypeId ?? "none");
      setSource(editingLead.source);
      setStageId(editingLead.stageId);
      setSubStageId(editingLead.subStageId ?? "none");
      setOwnerEmployeeId(editingLead.ownerEmployeeId ?? "none");
      setStatus(editingLead.status);
      setTags(editingLead.tags ?? []);
      setNextAction(editingLead.nextAction);
      setNextFollowUpAt(toLocalInput(editingLead.nextFollowUpAt));
      setNotes(editingLead.notes ?? "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setCompanyName("");
      setBusinessTypeId("none");
      setSource("other");
      setStageId(
        defaultStageId ||
          activeStages.find((s) => s.active)?.id ||
          safeStages[0]?.id ||
          ""
      );
      setSubStageId("none");
      setOwnerEmployeeId("none");
      setStatus("active");
      setTags([]);
      setNextAction("none");
      setNextFollowUpAt("");
      setNotes("");
    }
    setSaving(false);
  });

  function toggleTag(tag: CrmLeadTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  }

  function onStageIdChange(next: string) {
    setStageId(next);
    setSubStageId("none");
  }

  const activeSubStages = (
    activeStages.find((s) => s.id === stageId)?.subStages ?? []
  ).filter((s) => s.active || s.id === editingLead?.subStageId);

  async function submit() {
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      companyName: companyName.trim(),
      businessTypeId:
        businessTypeId === "none" ? null : businessTypeId || null,
      source,
      stageId,
      subStageId: subStageId === "none" ? null : subStageId || null,
      ownerEmployeeId:
        ownerEmployeeId === "none" ? null : ownerEmployeeId || null,
      status,
      tags,
      nextAction,
      nextFollowUpAt: nextFollowUpAt
        ? new Date(nextFollowUpAt).toISOString()
        : null,
      notes,
    };

    const parsed = createLeadSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(t("crm.leadForm.validation"));
      return;
    }

    setSaving(true);
    const res = editingLead
      ? await updateCrmLead(editingLead.id, parsed.data)
      : await createCrmLead(parsed.data);
    setSaving(false);

    if (!res.success || !res.data) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(
      editingLead ? t("crm.toast.leadUpdated") : t("crm.toast.leadCreated")
    );
    onOpenChange(false);
    onSaved?.(res.data);
  }

  return {
    t,
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    companyName,
    setCompanyName,
    businessTypeId,
    setBusinessTypeId,
    source,
    setSource,
    stageId,
    onStageIdChange,
    subStageId,
    setSubStageId,
    activeSubStages,
    ownerEmployeeId,
    setOwnerEmployeeId,
    status,
    setStatus,
    tags,
    toggleTag,
    nextAction,
    setNextAction,
    nextFollowUpAt,
    setNextFollowUpAt,
    notes,
    setNotes,
    saving,
    activeStages,
    activeBusinessTypes,
    submit,
  };
}
