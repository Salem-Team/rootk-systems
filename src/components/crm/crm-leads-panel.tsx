"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  ChevronDown,
  Download,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrmLeadsBulkAdd } from "@/components/crm/crm-leads-bulk-add";
import { CrmLeadsBulkBar } from "@/components/crm/crm-leads-bulk-bar";
import { CrmLeadsFilters } from "@/components/crm/crm-leads-filters";
import { CrmLeadsImportDialog } from "@/components/crm/crm-leads-import-dialog";
import { CrmLeadsTable } from "@/components/crm/crm-leads-table";
import { useCrmLeadsPanel } from "@/hooks/use-crm-leads-panel";
import { downloadCrmLeadsWorkbook } from "@/lib/crm/leads-excel";
import { canFilterCrmByOwner } from "@/lib/crm/lead-filters";
import { cn } from "@/lib/utils";
import { exportCrmLeadRows } from "@/services/crm.service";
import type { Employee } from "@/types";
import type {
  CrmBusinessType,
  CrmFeedbackType,
  CrmLead,
  CrmLeadFilters,
  CrmStage,
  PaginatedLeads,
} from "@/types/crm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CrmLeadsPanelProps {
  leads: PaginatedLeads | null;
  stages: CrmStage[];
  employees: Employee[];
  filters: CrmLeadFilters;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
  loading?: boolean;
  onRowClick: (lead: CrmLead) => void;
  onViewHistory?: (lead: CrmLead) => void;
  onAddLead?: () => void;
  onImported?: () => void;
  canAssign?: boolean;
  canViewOthers?: boolean;
  canViewTeam?: boolean;
  canImport?: boolean;
  /** Keys that stay locked (e.g. Delay: status/followUp) — excluded from filter badge. */
  filterBadgeExclude?: Array<keyof CrmLeadFilters>;
  lockedFilterKeys?: Array<"status" | "followUp">;
  businessTypes?: CrmBusinessType[];
  feedbackTypes?: CrmFeedbackType[];
  className?: string;
  /** Hide the panel title on dense mobile contexts (Delay embeds this panel). */
  hideTitle?: boolean;
}

function countBadgeFilters(
  filters: CrmLeadFilters,
  exclude: Array<keyof CrmLeadFilters> = []
): number {
  const skip = new Set(exclude);
  let n = 0;
  if (!skip.has("search") && filters.search?.trim()) n += 1;
  if (!skip.has("stageId") && filters.stageId) n += 1;
  if (!skip.has("status") && filters.status) n += 1;
  if (!skip.has("source") && filters.source) n += 1;
  if (!skip.has("ownerEmployeeId") && filters.ownerEmployeeId) n += 1;
  if (!skip.has("followUp") && filters.followUp) n += 1;
  return n;
}

/** Searchable, filterable leads table with bulk actions + Excel IO. */
export function CrmLeadsPanel({
  leads,
  stages,
  employees,
  filters,
  onFiltersChange,
  loading = false,
  onRowClick,
  onViewHistory,
  onAddLead,
  onImported,
  canAssign = false,
  canViewOthers = false,
  canViewTeam = false,
  canImport = false,
  filterBadgeExclude = [],
  lockedFilterKeys,
  businessTypes = [],
  feedbackTypes = [],
  className,
  hideTitle = false,
}: CrmLeadsPanelProps) {
  const panel = useCrmLeadsPanel({
    leads,
    stages,
    employees,
    filters,
    onFiltersChange,
    filterBadgeExclude,
  });
  const { t } = panel;
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const filterCount = countBadgeFilters(filters, filterBadgeExclude);
  const showOwnerFilter = canFilterCrmByOwner({
    canAssign,
    canViewOthers,
    canViewTeam,
  });

  async function onExport() {
    setExporting(true);
    const res = await exportCrmLeadRows(filters);
    setExporting(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.loadFailed"));
      return;
    }
    const rows = res.data ?? [];
    await downloadCrmLeadsWorkbook(
      `crm-leads-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      rows
    );
    toast.success(t("crm.toast.exported", { count: String(rows.length) }));
  }

  const toolButtons = (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11 touch-manipulation sm:min-h-8"
        disabled={exporting}
        onClick={() => void onExport()}
        aria-label={t("crm.actions.export")}
      >
        <Download className="h-3.5 w-3.5 sm:me-1.5" />
        <span className="sm:inline">{t("crm.actions.export")}</span>
      </Button>
      {canImport ? (
        <CrmLeadsBulkAdd
          stages={stages}
          businessTypes={businessTypes}
          employees={employees}
          canAssign={canAssign}
          onImported={onImported}
          size="sm"
          className="min-h-11 sm:min-h-8"
        />
      ) : null}
      {canImport ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 touch-manipulation sm:min-h-8"
          onClick={() => setImportOpen(true)}
          aria-label={t("crm.actions.import")}
        >
          <Upload className="h-3.5 w-3.5 sm:me-1.5" />
          <span className="sm:inline">{t("crm.actions.import")}</span>
        </Button>
      ) : null}
    </>
  );

  return (
    <section
      className={cn(
        "surface-panel overflow-hidden",
        "max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0",
        className
      )}
    >
      <div className="panel-header flex flex-col gap-2.5 !px-0 sm:gap-3 sm:!px-5">
        {!hideTitle ? (
          <h2 className="hidden px-5 text-sm font-semibold tracking-tight sm:block">
            {t("crm.leads.title")}
          </h2>
        ) : null}

        {/* Mobile: edge-to-edge search; sm+: search shares the toolbar row */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative w-full min-w-0 px-3 sm:flex-1 sm:px-0">
            <Search className="pointer-events-none absolute start-[1.625rem] top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:start-3 sm:h-3.5 sm:w-3.5" />
            <Input
              ref={panel.searchInputRef}
              type="search"
              value={panel.searchLocal}
              onChange={(e) => panel.onSearchChange(e.target.value)}
              onBlur={panel.onSearchBlur}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  panel.onSearchChange("");
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder={t("crm.filters.search")}
              className={cn(
                "h-12 w-full rounded-2xl border-border/60 bg-muted/40 ps-11 pe-11 text-base shadow-none",
                "placeholder:text-muted-foreground/70",
                "focus-visible:border-primary/35 focus-visible:bg-background focus-visible:ring-primary/20",
                "[&::-webkit-search-cancel-button]:hidden",
                "sm:h-9 sm:rounded-lg sm:bg-background sm:ps-9 sm:pe-9 sm:text-sm"
              )}
              aria-label={t("crm.filters.search")}
              autoComplete="off"
              enterKeyHint="search"
              inputMode="search"
              dir="auto"
            />
            {panel.searchLocal.trim() ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="absolute end-[1.125rem] top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-muted-foreground hover:text-foreground sm:end-1.5 sm:h-7 sm:w-7 sm:rounded-md"
                onClick={() => {
                  panel.onSearchChange("");
                  panel.searchInputRef.current?.focus();
                }}
                aria-label={t("dateTime.clear")}
              >
                <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            ) : null}
          </div>

          <div className="flex w-full items-center gap-2 px-3 sm:w-auto sm:shrink-0 sm:px-0">
            <Button
              type="button"
              size="sm"
              variant={filterCount > 0 ? "default" : "outline"}
              className="relative h-11 min-w-11 flex-1 touch-manipulation rounded-xl px-3 sm:h-9 sm:min-w-9 sm:flex-none lg:hidden"
              onClick={() => panel.setFiltersOpen(true)}
              aria-expanded={panel.filtersOpen}
              aria-label={t("crm.filters.title")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="ms-1.5 text-sm font-medium sm:hidden">
                {t("crm.filters.title")}
              </span>
              {filterCount > 0 ? (
                <span className="absolute -end-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-bold text-white">
                  {filterCount > 9 ? "9+" : filterCount}
                </span>
              ) : null}
            </Button>
            {showOwnerFilter ? (
              <Select
                value={filters.ownerEmployeeId || "all"}
                onValueChange={(v) =>
                  onFiltersChange((prev) => ({
                    ...prev,
                    ownerEmployeeId: v === "all" ? undefined : v,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger
                  className="h-11 min-w-0 flex-1 rounded-xl border-border/70 sm:h-9 sm:w-[10.5rem] sm:flex-none sm:rounded-lg"
                  aria-label={t("crm.filters.byUser")}
                >
                  <SelectValue placeholder={t("crm.filters.byUser")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("crm.filters.allSales")}</SelectItem>
                  <SelectItem value="__unassigned__">
                    {t("crm.filters.unassigned")}
                  </SelectItem>
                  {panel.safeEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-11 shrink-0 touch-manipulation rounded-xl px-2.5 sm:hidden"
              aria-expanded={toolsOpen}
              aria-label={t("crm.actions.moreTools")}
              onClick={() => setToolsOpen((v) => !v)}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  toolsOpen && "rotate-180"
                )}
              />
            </Button>
          </div>
        </div>

        {/* Collapsed tools on phones; always visible from sm+ */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 px-3 sm:px-0",
            toolsOpen ? "flex" : "hidden",
            "sm:flex"
          )}
        >
          {toolButtons}
        </div>
      </div>

      <CrmLeadsFilters
        open={panel.filtersOpen}
        onOpenChange={panel.setFiltersOpen}
        filters={filters}
        stages={panel.safeStages}
        employees={panel.safeEmployees}
        canAssign={canAssign}
        canViewOthers={canViewOthers || canViewTeam}
        hasActiveFilters={panel.hasActiveFilters}
        lockedKeys={lockedFilterKeys}
        onFiltersChange={onFiltersChange}
        onClearFilters={panel.clearFilters}
      />

      <CrmLeadsBulkBar
        selectedCount={panel.selected.size}
        stages={panel.safeStages}
        employees={panel.safeEmployees}
        feedbackTypes={feedbackTypes}
        canAssign={canAssign}
        busy={panel.busy}
        onAssign={(ownerEmployeeId) =>
          void panel.runBulk("assign", ownerEmployeeId)
        }
        onChangeStage={(stageId, loss) =>
          void panel.runBulk("change_stage", stageId, loss)
        }
        onChangeStatus={(status) =>
          void panel.runBulk("change_status", status)
        }
        onArchive={() => void panel.runBulk("archive")}
        onDelete={() => void panel.runBulk("delete")}
        onClear={panel.clearSelection}
      />

      <CrmLeadsTable
        loading={loading}
        page={panel.page}
        filters={filters}
        stageMap={panel.stageMap}
        employeeMap={panel.employeeMap}
        selected={panel.selected}
        allSelected={panel.allSelected}
        someSelected={panel.someSelected}
        hasActiveFilters={panel.hasActiveFilters}
        onAddLead={onAddLead}
        onRowClick={onRowClick}
        onViewHistory={onViewHistory}
        onToggleAll={panel.toggleAll}
        onToggleOne={panel.toggleOne}
        onClearFilters={panel.clearFilters}
        onFiltersChange={onFiltersChange}
      />

      <CrmLeadsImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={onImported}
      />
    </section>
  );
}
