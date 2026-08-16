import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { SOURCES } from "@/lib/crm/lead-form-options";
import {
  MAX_BULK_ADD_LEADS,
  parseBulkLeads,
} from "@/lib/crm/parse-bulk-leads";
import { crmUserFacingMessage } from "@/lib/crm/client-error";
import { importCrmLeads } from "@/services/crm.service";
import type { Employee } from "@/types";
import type { CrmBusinessType, CrmLeadSource, CrmStage } from "@/types/crm";

interface UseCrmLeadsBulkAddArgs {
  stages: CrmStage[];
  businessTypes?: CrmBusinessType[];
  employees: Employee[];
  canAssign?: boolean;
  onImported?: () => void;
}

export function useCrmLeadsBulkAdd({
  stages,
  businessTypes = [],
  employees,
  canAssign = false,
  onImported,
}: UseCrmLeadsBulkAddArgs) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState<CrmLeadSource>("other");
  const [stageId, setStageId] = useState("");
  const [ownerEmployeeId, setOwnerEmployeeId] = useState("none");
  const [businessTypeId, setBusinessTypeId] = useState("none");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const activeStages = useMemo(
    () =>
      (Array.isArray(stages) ? stages : [])
        .filter((s) => s.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [stages]
  );
  const activeBusinessTypes = useMemo(
    () => (Array.isArray(businessTypes) ? businessTypes : []).filter((b) => b.active),
    [businessTypes]
  );
  const safeEmployees = useMemo(
    () => (Array.isArray(employees) ? employees : []),
    [employees]
  );

  const parsed = useMemo(() => parseBulkLeads(raw, MAX_BULK_ADD_LEADS), [raw]);

  const reset = useCallback(() => {
    setRaw("");
    setSource("other");
    setStageId(activeStages[0]?.id ?? "");
    setOwnerEmployeeId("none");
    setBusinessTypeId("none");
    setBusy(false);
    setSummary(null);
  }, [activeStages]);

  const hydrateDefaults = useCallback(() => {
    setStageId((current) => current || activeStages[0]?.id || "");
  }, [activeStages]);

  async function submit() {
    if (parsed.rows.length === 0) {
      toast.error(t("crm.bulkAdd.noRows"));
      return false;
    }
    const resolvedStageId = stageId || activeStages[0]?.id || "";
    if (!resolvedStageId) {
      toast.error(t("crm.leadForm.validation"));
      return false;
    }
    setBusy(true);
    const res = await importCrmLeads(
      parsed.rows.map((row) => ({
        name: row.name,
        phone: row.phone,
        email: "",
        companyName: "",
        businessType:
          businessTypeId !== "none" ? businessTypeId : "",
        source,
        stage: resolvedStageId,
        owner: canAssign && ownerEmployeeId !== "none" ? ownerEmployeeId : "",
        status: "active",
        tags: "",
        nextAction: "none",
        notes: "",
      }))
    );
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(crmUserFacingMessage(res, t, "crm.errors.saveFailed"));
      return false;
    }
    const { created, failed, total } = res.data;
    const summaryText = t("crm.import.summary", {
      created: String(created),
      failed: String(failed),
      total: String(total),
    });
    setSummary(summaryText);
    if (created === 0) {
      toast.error(summaryText);
      return false;
    }
    toast.success(t("crm.toast.imported", { count: String(created) }));
    onImported?.();
    return failed === 0;
  }

  return {
    t,
    raw,
    setRaw,
    source,
    setSource,
    sources: SOURCES,
    stageId,
    setStageId,
    ownerEmployeeId,
    setOwnerEmployeeId,
    businessTypeId,
    setBusinessTypeId,
    busy,
    summary,
    parsed,
    activeStages,
    activeBusinessTypes,
    safeEmployees,
    canAssign,
    reset,
    hydrateDefaults,
    submit,
  };
}
