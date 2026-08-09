import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmList, ensurePaginatedLeads } from "@/lib/crm-normalize";
import { bulkUpdateCrmLeads } from "@/services/crm.service";
import type { Employee } from "@/types";
import type { CrmLeadFilters, CrmStage, PaginatedLeads } from "@/types/crm";

export type BulkAction = "assign" | "change_stage" | "change_status" | "archive";

interface UseCrmLeadsPanelArgs {
  leads: PaginatedLeads | null;
  stages: CrmStage[];
  employees: Employee[];
  filters: CrmLeadFilters;
  onFiltersChange: (filters: CrmLeadFilters) => void;
}

export function useCrmLeadsPanel({
  leads,
  stages,
  employees,
  filters,
  onFiltersChange,
}: UseCrmLeadsPanelArgs) {
  const { t } = useTranslation();
  const [searchLocal, setSearchLocal] = useState(filters.search ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | "">("");
  const [bulkValue, setBulkValue] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const safeStages = useMemo(() => ensureCrmList<CrmStage>(stages), [stages]);
  const safeEmployees = useMemo(
    () => (Array.isArray(employees) ? employees : []),
    [employees]
  );
  const page = ensurePaginatedLeads(leads);
  const stageMap = useMemo(
    () => new Map(safeStages.map((s) => [s.id, s])),
    [safeStages]
  );
  const employeeMap = useMemo(
    () => new Map(safeEmployees.map((e) => [e.id, e.name])),
    [safeEmployees]
  );

  useEffect(() => {
    setSearchLocal(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((filters.search ?? "") !== searchLocal) {
        onFiltersChange({ ...filters, search: searchLocal || undefined, page: 1 });
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  useEffect(() => {
    setSelected(new Set());
  }, [page.page, page.items]);

  const items = page.items;
  const allSelected =
    items.length > 0 && items.every((l) => selected.has(l.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSearchLocal("");
    onFiltersChange({ page: 1, pageSize: filters.pageSize ?? 20 });
  }

  async function runBulk(action: BulkAction, value?: string) {
    if (selected.size === 0) return;
    setBusy(true);
    const res = await bulkUpdateCrmLeads({
      ids: [...selected],
      action,
      value,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(
      t("crm.toast.bulkUpdated", { count: String(res.data.updated) })
    );
    setSelected(new Set());
    setBulkAction("");
    setBulkValue("");
    setArchiveOpen(false);
    onFiltersChange({ ...filters });
  }

  async function applyBulk() {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === "archive") {
      setArchiveOpen(true);
      return;
    }
    if (
      (bulkAction === "change_stage" || bulkAction === "change_status") &&
      !bulkValue
    ) {
      return;
    }
    const value =
      bulkAction === "assign"
        ? bulkValue === "none" || !bulkValue
          ? ""
          : bulkValue
        : bulkValue || undefined;
    await runBulk(bulkAction, value);
  }

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.stageId ||
      filters.status ||
      filters.source ||
      filters.ownerEmployeeId ||
      filters.followUp
  );

  return {
    t,
    searchLocal,
    setSearchLocal,
    filtersOpen,
    setFiltersOpen,
    selected,
    bulkAction,
    setBulkAction,
    bulkValue,
    setBulkValue,
    archiveOpen,
    setArchiveOpen,
    busy,
    safeStages,
    safeEmployees,
    page,
    stageMap,
    employeeMap,
    items,
    allSelected,
    toggleAll,
    toggleOne,
    clearFilters,
    runBulk,
    applyBulk,
    hasActiveFilters,
  };
}
