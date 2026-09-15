import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmList, ensurePaginatedLeads } from "@/lib/crm-normalize";
import { emitCrmUpdated } from "@/lib/events";
import { bulkUpdateCrmLeads } from "@/services/crm.service";
import type { Employee } from "@/types";
import type { CrmLeadFilters, CrmStage, PaginatedLeads } from "@/types/crm";

export type BulkAction =
  | "assign"
  | "change_stage"
  | "change_status"
  | "archive"
  | "delete";

interface UseCrmLeadsPanelArgs {
  leads: PaginatedLeads | null;
  stages: CrmStage[];
  employees: Employee[];
  filters: CrmLeadFilters;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
  /** Locked filter keys (e.g. Delay) excluded from "active filters" / clear UX. */
  filterBadgeExclude?: Array<keyof CrmLeadFilters>;
}

const SEARCH_DEBOUNCE_MS = 300;

export function useCrmLeadsPanel({
  leads,
  stages,
  employees,
  filters,
  onFiltersChange,
  filterBadgeExclude = [],
}: UseCrmLeadsPanelArgs) {
  const { t } = useTranslation();
  const [searchLocal, setSearchLocal] = useState(filters.search ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  /** True while the user is typing — ignore external filter.search sync. */
  const searchEditingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const safeStages = useMemo(() => ensureCrmList<CrmStage>(stages), [stages]);
  const safeEmployees = useMemo(
    () => (Array.isArray(employees) ? employees : []),
    [employees]
  );
  const page = useMemo(() => ensurePaginatedLeads(leads), [leads]);
  const itemIdKey = useMemo(
    () => page.items.map((lead) => lead.id).join("\0"),
    [page]
  );
  const stageMap = useMemo(
    () => new Map(safeStages.map((s) => [s.id, s])),
    [safeStages]
  );
  const employeeMap = useMemo(
    () => new Map(safeEmployees.map((e) => [e.id, e.name])),
    [safeEmployees]
  );

  // Keep local input in sync when filters change from outside (clear / navigation),
  // but never clobber mid-keystroke edits.
  useEffect(() => {
    if (searchEditingRef.current) return;
    const next = filters.search ?? "";
    setSearchLocal((prev) => (prev === next ? prev : next));
  }, [filters.search]);

  // Debounced search → filters (functional update avoids stale stage/owner races).
  useEffect(() => {
    const trimmed = searchLocal.trim();
    const timer = window.setTimeout(() => {
      onFiltersChange((prev) => {
        const prevSearch = (prev.search ?? "").trim();
        if (prevSearch === trimmed) {
          searchEditingRef.current = false;
          return prev;
        }
        searchEditingRef.current = false;
        return {
          ...prev,
          search: trimmed || undefined,
          page: 1,
        };
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchLocal, onFiltersChange]);

  useEffect(() => {
    const valid = new Set(itemIdKey ? itemIdKey.split("\0") : []);
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [itemIdKey]);

  const items = page.items;
  const allSelected =
    items.length > 0 && items.every((l) => selected.has(l.id));
  const someSelected = selected.size > 0 && !allSelected;

  function onSearchChange(value: string) {
    searchEditingRef.current = true;
    setSearchLocal(value);
  }

  function onSearchBlur() {
    // Allow external sync again after the pending debounce settles.
    window.setTimeout(() => {
      if (document.activeElement === searchInputRef.current) return;
      searchEditingRef.current = false;
    }, SEARCH_DEBOUNCE_MS + 50);
  }

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
    searchEditingRef.current = false;
    setSearchLocal("");
    onFiltersChange((prev) => {
      const next: CrmLeadFilters = {
        page: 1,
        pageSize: prev.pageSize ?? 20,
        sort: prev.sort ?? "updatedAt",
        order: prev.order ?? "desc",
      };
      // Preserve locked Delay filters so clear doesn't fight the parent lock.
      if (exclude.has("status") && prev.status) next.status = prev.status;
      if (exclude.has("followUp") && prev.followUp) next.followUp = prev.followUp;
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function runBulk(
    action: BulkAction,
    value?: string,
    extra?: { lossReasonTypeId?: string; lossReasonDetails?: string }
  ) {
    if (selected.size === 0) return;
    setBusy(true);
    const res = await bulkUpdateCrmLeads({
      ids: [...selected],
      action,
      value,
      ...(extra?.lossReasonTypeId
        ? { lossReasonTypeId: extra.lossReasonTypeId }
        : {}),
      ...(extra?.lossReasonDetails
        ? { lossReasonDetails: extra.lossReasonDetails }
        : {}),
    });
    setBusy(false);
    if (!res.success) {
      toast.error(
        res.message ??
          (action === "delete"
            ? t("crm.errors.deleteFailed")
            : t("crm.errors.saveFailed"))
      );
      return;
    }
    const count = String(res.data.updated);
    toast.success(
      action === "delete"
        ? t("crm.toast.bulkDeleted", { count })
        : action === "archive"
          ? t("crm.toast.archived")
          : t("crm.toast.bulkUpdated", { count })
    );
    setSelected(new Set());
    // Force a soft list refresh even when filter values are unchanged
    // (sameLeadFilters would otherwise no-op a `{ ...prev }` write).
    emitCrmUpdated();
  }

  const exclude = useMemo(
    () => new Set(filterBadgeExclude),
    [filterBadgeExclude]
  );

  const hasActiveFilters = Boolean(
    (!exclude.has("search") && filters.search) ||
      (!exclude.has("stageId") && filters.stageId) ||
      (!exclude.has("status") && filters.status) ||
      (!exclude.has("source") && filters.source) ||
      (!exclude.has("ownerEmployeeId") && filters.ownerEmployeeId) ||
      (!exclude.has("followUp") && filters.followUp)
  );

  return {
    t,
    searchLocal,
    onSearchChange,
    onSearchBlur,
    searchInputRef,
    filtersOpen,
    setFiltersOpen,
    selected,
    busy,
    safeStages,
    safeEmployees,
    page,
    stageMap,
    employeeMap,
    items,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clearFilters,
    clearSelection,
    runBulk,
    hasActiveFilters,
  };
}
