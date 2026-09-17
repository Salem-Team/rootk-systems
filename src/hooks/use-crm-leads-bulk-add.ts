import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { SOURCES } from "@/lib/crm/lead-form-options";
import {
  MAX_BULK_ADD_LEADS,
  formatBulkLeadLine,
  parseBulkLeads,
} from "@/lib/crm/parse-bulk-leads";
import { crmUserFacingMessage } from "@/lib/crm/client-error";
import { importCrmLeads } from "@/services/crm.service";
import { mustOwnCreatedCrmLead } from "@/lib/crm-policies";
import {
  authPermissionSet,
  getSessionRole,
} from "@/stores/session-store";
import type { Employee } from "@/types";
import type { CrmBusinessType, CrmLeadSource, CrmStage } from "@/types/crm";

export type BulkImportFailure = {
  e164: string;
  phone: string;
  name: string;
  message: string;
};

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
  const lockOwnerToSelf = mustOwnCreatedCrmLead(
    getSessionRole(),
    authPermissionSet()
  );
  const canPickOwner = canAssign && !lockOwnerToSelf;
  const [raw, setRawState] = useState("");
  const [source, setSource] = useState<CrmLeadSource>("other");
  const [stageId, setStageId] = useState("");
  const [ownerEmployeeId, setOwnerEmployeeId] = useState("none");
  const [businessTypeId, setBusinessTypeId] = useState("none");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [importFailures, setImportFailures] = useState<BulkImportFailure[]>(
    []
  );

  const setRaw = useCallback((value: string) => {
    setRawState(value);
    setImportFailures([]);
  }, []);

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
    setRawState("");
    setSource("other");
    setStageId(activeStages[0]?.id ?? "");
    setOwnerEmployeeId("none");
    setBusinessTypeId("none");
    setBusy(false);
    setSummary(null);
    setImportFailures([]);
  }, [activeStages]);

  const hydrateDefaults = useCallback(() => {
    setStageId((current) => current || activeStages[0]?.id || "");
  }, [activeStages]);

  const failureByE164 = useMemo(() => {
    const map = new Map<string, BulkImportFailure>();
    for (const item of importFailures) map.set(item.e164, item);
    return map;
  }, [importFailures]);

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
    const submittedRows = parsed.rows;
    setBusy(true);
    setImportFailures([]);
    const res = await importCrmLeads(
      submittedRows.map((row) => ({
        name: row.name,
        phone: row.phone,
        email: "",
        companyName: "",
        businessType:
          businessTypeId !== "none" ? businessTypeId : "",
        source,
        stage: resolvedStageId,
        owner: canPickOwner && ownerEmployeeId !== "none" ? ownerEmployeeId : "",
        status: "active",
        tags: "",
        nextAction: "none",
        request: "",
        budget: "",
        notes: "",
      }))
    );
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(crmUserFacingMessage(res, t, "crm.errors.saveFailed"));
      return false;
    }
    const { created, failed, total, results } = res.data;
    const summaryText = t("crm.import.summary", {
      created: String(created),
      failed: String(failed),
      total: String(total),
    });
    setSummary(summaryText);

    const failures: BulkImportFailure[] = [];
    for (const result of results) {
      if (result.ok) continue;
      const row = submittedRows[result.row - 1];
      if (!row) continue;
      failures.push({
        e164: row.e164,
        phone: row.phone,
        name: row.name,
        message: result.message?.trim() || t("crm.errors.saveFailed"),
      });
    }

    if (failures.length > 0) {
      setRawState(failures.map(formatBulkLeadLine).join("\n"));
      setImportFailures(failures);
    } else {
      setImportFailures([]);
    }

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
    importFailures,
    failureByE164,
    parsed,
    activeStages,
    activeBusinessTypes,
    safeEmployees,
    canAssign: canPickOwner,
    reset,
    hydrateDefaults,
    submit,
  };
}
