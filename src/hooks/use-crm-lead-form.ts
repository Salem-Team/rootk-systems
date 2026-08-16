import { useState } from "react";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { toLocalInput } from "@/lib/crm/lead-form-options";
import { createLeadSchema } from "@/schemas/crm.schema";
import { createCrmLead, updateCrmLead } from "@/services/crm.service";
import { duplicateFromError } from "@/services/crm/crm-calls.service";
import { crmUserFacingMessage } from "@/lib/crm/client-error";
import { egyptianMobileFormValue, egyptianMobileLocalDigits } from "@/lib/crm/eg-phone-input";
import {
  ContactIdentityError,
  contactFieldValue,
  detectContactKind,
  resolveCrmContact,
  type CrmContactKind,
} from "@/lib/crm/contact-identity";
import {
  MAX_LEAD_CONTACTS,
  allLeadContacts,
  type LeadFormContactDraft,
} from "@/lib/crm/lead-contacts";
import { getWorkEmployeeId } from "@/stores/session-store";
import type {
  CrmBusinessType,
  CrmDuplicateLeadSummary,
  CrmLead,
  CrmLeadSource,
  CrmLeadStatus,
  CrmLeadTag,
  CrmNextAction,
  CrmStage,
} from "@/types/crm";

function emptyContactDraft(): LeadFormContactDraft {
  return { id: "c-0", kind: "phone", value: "" };
}

function valueForContact(
  kind: CrmContactKind,
  phone: string,
  phoneNormalized?: string | null
) {
  return kind === "phone"
    ? egyptianMobileLocalDigits(phone)
    : contactFieldValue(phone, phoneNormalized);
}

function draftsFromLead(lead: CrmLead): LeadFormContactDraft[] {
  const rows = allLeadContacts(
    lead.phone,
    lead.phoneNormalized,
    lead.contacts,
    lead.contactKind
  );
  if (rows.length === 0) return [emptyContactDraft()];
  return rows.map((row, index) => ({
    id: `c-${index}-${row.phoneNormalized || row.phone}`,
    kind: row.kind,
    value: valueForContact(row.kind, row.phone, row.phoneNormalized),
  }));
}

interface UseCrmLeadFormArgs {
  open: boolean;
  stages: CrmStage[];
  businessTypes?: CrmBusinessType[];
  editingLead?: CrmLead | null;
  canAssign?: boolean;
  defaultStageId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved?: (lead: CrmLead) => void;
  onOpenExistingLead?: (leadId: string) => void;
}

export function useCrmLeadForm({
  open,
  stages,
  businessTypes = [],
  editingLead = null,
  canAssign = false,
  defaultStageId,
  onOpenChange,
  onSaved,
  onOpenExistingLead,
}: UseCrmLeadFormArgs) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState<LeadFormContactDraft[]>([
    emptyContactDraft(),
  ]);
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
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<CrmDuplicateLeadSummary | null>(null);
  const [duplicateOwnedByOther, setDuplicateOwnedByOther] = useState(false);

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
      setContacts(draftsFromLead(editingLead));
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
      setContacts([emptyContactDraft()]);
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
      setOwnerEmployeeId(canAssign ? "none" : getWorkEmployeeId() || "none");
      setStatus("active");
      setTags([]);
      setNextAction("none");
      setNextFollowUpAt("");
      setNotes("");
      try {
        const raw = window.sessionStorage.getItem("rootk.crm.contact-draft");
        if (raw) {
          const draft = JSON.parse(raw) as { name?: string; phone?: string };
          if (draft.name) setName(draft.name);
          if (draft.phone) {
            const kind = detectContactKind(draft.phone, null);
            setContacts([
              {
                id: "c-0",
                kind,
                value: valueForContact(kind, draft.phone, null),
              },
            ]);
          }
          window.sessionStorage.removeItem("rootk.crm.contact-draft");
        }
      } catch {
        /* ignore malformed draft */
      }
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

  function patchContact(
    id: string,
    patch: Partial<Pick<LeadFormContactDraft, "kind" | "value">>
  ) {
    setContacts((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextKind = patch.kind ?? row.kind;
        if (patch.kind && patch.kind !== row.kind) {
          return { ...row, kind: nextKind, value: "" };
        }
        return { ...row, ...patch };
      })
    );
  }

  function addContact() {
    setContacts((prev) => {
      if (prev.length >= MAX_LEAD_CONTACTS) return prev;
      return [
        ...prev,
        {
          id: `c-${Date.now()}`,
          kind: "phone" as const,
          value: "",
        },
      ];
    });
  }

  function removeContact(id: string) {
    setContacts((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)
    );
  }

  async function submit() {
    const filled = contacts.filter((row) => row.value.trim());
    if (filled.length === 0) {
      toast.error(t("crm.leadForm.validation"));
      return;
    }
    const resolvedContacts: Array<{ kind: CrmContactKind; phone: string }> = [];
    const seen = new Set<string>();
    for (const [index, row] of filled.entries()) {
      const raw =
        row.kind === "phone" ? egyptianMobileFormValue(row.value) : row.value.trim();
      try {
        const resolved = resolveCrmContact({
          raw,
          kind: row.kind,
          previousPhone: index === 0 ? editingLead?.phone : undefined,
          previousNormalized:
            index === 0 ? editingLead?.phoneNormalized : undefined,
        });
        if (resolved.phoneNormalized) {
          if (seen.has(resolved.phoneNormalized)) {
            toast.error(t("crm.contact.duplicateOnLead"));
            return;
          }
          seen.add(resolved.phoneNormalized);
        }
        resolvedContacts.push({ kind: resolved.kind, phone: resolved.phone });
      } catch (error) {
        if (error instanceof ContactIdentityError) {
          toast.error(
            error.code === "empty"
              ? t("crm.leadForm.validation")
              : error.code === "invalid_handle"
                ? t("crm.contact.invalidHandle")
                : t("crm.phone.invalid")
          );
          return;
        }
        throw error;
      }
    }

    const primary = resolvedContacts[0];
    const payload = {
      name: name.trim(),
      phone: primary!.phone,
      contactKind: primary!.kind,
      contacts: resolvedContacts,
      email: email.trim(),
      companyName: companyName.trim(),
      businessTypeId:
        businessTypeId === "none" ? null : businessTypeId || null,
      source,
      stageId,
      subStageId: subStageId === "none" ? null : subStageId || null,
      ownerEmployeeId: canAssign
        ? ownerEmployeeId === "none"
          ? null
          : ownerEmployeeId || null
        : getWorkEmployeeId() || null,
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
      const dup = duplicateFromError(res.error ?? {});
      if (dup) {
        const existing = dup.existingLead
          ? {
              id: dup.existingLead.id,
              name: dup.existingLead.name,
              phone: dup.existingLead.phone,
              phoneNormalized: dup.existingLead.phoneNormalized ?? null,
              ownerEmployeeId: dup.existingLead.ownerEmployeeId,
              stageId: dup.existingLead.stageId,
            }
          : null;
        setDuplicateLead(existing);
        setDuplicateOwnedByOther(Boolean(dup.ownedByOther) && !existing);
        setDuplicateOpen(true);
        return;
      }
      toast.error(crmUserFacingMessage(res, t, "crm.errors.saveFailed"));
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
    contacts,
    patchContact,
    addContact,
    removeContact,
    canAddContact: contacts.length < MAX_LEAD_CONTACTS,
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
    duplicateOpen,
    setDuplicateOpen,
    duplicateLead,
    duplicateOwnedByOther,
    onOpenExistingLead,
  };
}
