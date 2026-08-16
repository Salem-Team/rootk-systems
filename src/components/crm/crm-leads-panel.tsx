"use client";

import { useState } from "react";
import { Download, Search, SlidersHorizontal, Upload } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { exportCrmLeadRows } from "@/services/crm.service";
import type { Employee } from "@/types";
import type {
  CrmBusinessType,
  CrmLead,
  CrmLeadFilters,
  CrmStage,
  PaginatedLeads,
} from "@/types/crm";

interface CrmLeadsPanelProps {
  leads: PaginatedLeads | null;
  stages: CrmStage[];
  employees: Employee[];
  filters: CrmLeadFilters;
  onFiltersChange: (filters: CrmLeadFilters) => void;
  loading?: boolean;
  onRowClick: (lead: CrmLead) => void;
  onAddLead?: () => void;
  onImported?: () => void;
  canAssign?: boolean;
  canViewOthers?: boolean;
  canImport?: boolean;
  businessTypes?: CrmBusinessType[];
  className?: string;
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
  onAddLead,
  onImported,
  canAssign = false,
  canViewOthers = false,
  canImport = false,
  businessTypes = [],
  className,
}: CrmLeadsPanelProps) {
  const panel = useCrmLeadsPanel({ leads, stages, employees, filters, onFiltersChange });
  const { t } = panel;
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function onExport() {
    setExporting(true);
    const res = await exportCrmLeadRows(filters);
    setExporting(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.loadFailed"));
      return;
    }
    const rows = res.data ?? [];
    downloadCrmLeadsWorkbook(
      `crm-leads-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      rows
    );
    toast.success(t("crm.toast.exported", { count: String(rows.length) }));
  }

  return (
    <section className={cn("surface-panel", className)}>
      <div className="panel-header flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("crm.leads.title")}
        </h2>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={panel.searchLocal}
              onChange={(e) => panel.setSearchLocal(e.target.value)}
              placeholder={t("crm.filters.search")}
              className="h-9 w-full ps-8 sm:w-[220px]"
              aria-label={t("crm.filters.search")}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={exporting}
            onClick={() => void onExport()}
            aria-label={t("crm.actions.export")}
          >
            <Download className="h-3.5 w-3.5 sm:me-1.5" />
            <span className="hidden sm:inline">{t("crm.actions.export")}</span>
          </Button>
          {canImport ? (
            <CrmLeadsBulkAdd
              stages={stages}
              businessTypes={businessTypes}
              employees={employees}
              canAssign={canAssign}
              onImported={onImported}
              size="sm"
            />
          ) : null}
          {canImport ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setImportOpen(true)}
              aria-label={t("crm.actions.import")}
            >
              <Upload className="h-3.5 w-3.5 sm:me-1.5" />
              <span className="hidden sm:inline">{t("crm.actions.import")}</span>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="lg:hidden"
            onClick={() => panel.setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="me-1.5 h-3.5 w-3.5" />
            {t("crm.filters.title")}
          </Button>
        </div>
      </div>

      <CrmLeadsFilters
        open={panel.filtersOpen}
        filters={filters}
        stages={panel.safeStages}
        employees={panel.safeEmployees}
        canAssign={canAssign}
        canViewOthers={canViewOthers}
        hasActiveFilters={panel.hasActiveFilters}
        onFiltersChange={onFiltersChange}
        onClearFilters={panel.clearFilters}
      />

      <CrmLeadsBulkBar
        selectedCount={panel.selected.size}
        stages={panel.safeStages}
        employees={panel.safeEmployees}
        canAssign={canAssign}
        busy={panel.busy}
        onAssign={(ownerEmployeeId) =>
          void panel.runBulk("assign", ownerEmployeeId)
        }
        onChangeStage={(stageId) => void panel.runBulk("change_stage", stageId)}
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
        hasActiveFilters={panel.hasActiveFilters}
        onAddLead={onAddLead}
        onRowClick={onRowClick}
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
