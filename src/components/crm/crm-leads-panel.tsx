"use client";

import { useState } from "react";
import { Download, Search, SlidersHorizontal, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrmLeadsBulkBar } from "@/components/crm/crm-leads-bulk-bar";
import { CrmLeadsFilters } from "@/components/crm/crm-leads-filters";
import { CrmLeadsImportDialog } from "@/components/crm/crm-leads-import-dialog";
import { CrmLeadsTable } from "@/components/crm/crm-leads-table";
import { useCrmLeadsPanel } from "@/hooks/use-crm-leads-panel";
import { CRM_LEAD_CSV_HEADERS } from "@/lib/crm/leads-csv";
import { cn, downloadCsv } from "@/lib/utils";
import { exportCrmLeadRows } from "@/services/crm.service";
import type { Employee } from "@/types";
import type { CrmLead, CrmLeadFilters, CrmStage, PaginatedLeads } from "@/types/crm";

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
  canImport?: boolean;
  className?: string;
}

/** Searchable, filterable leads table with bulk actions + CSV IO. */
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
  canImport = false,
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
    const header = [...CRM_LEAD_CSV_HEADERS];
    const body = rows.map((row) =>
      header.map((key) => row[key] ?? "")
    );
    downloadCsv(
      `crm-leads-${format(new Date(), "yyyy-MM-dd")}.csv`,
      [header, ...body]
    );
    toast.success(t("crm.toast.exported", { count: String(rows.length) }));
  }

  return (
    <section className={cn("surface-panel", className)}>
      <div className="panel-header flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("crm.leads.title")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={panel.searchLocal}
              onChange={(e) => panel.setSearchLocal(e.target.value)}
              placeholder={t("crm.filters.search")}
              className="h-9 w-[min(100%,220px)] ps-8"
              aria-label={t("crm.filters.search")}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={exporting}
            onClick={() => void onExport()}
          >
            <Download className="me-1.5 h-3.5 w-3.5" />
            {t("crm.actions.export")}
          </Button>
          {canImport ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="me-1.5 h-3.5 w-3.5" />
              {t("crm.actions.import")}
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
            {t("crm.filters.stage")}
          </Button>
        </div>
      </div>

      <CrmLeadsFilters
        open={panel.filtersOpen}
        filters={filters}
        stages={panel.safeStages}
        employees={panel.safeEmployees}
        canAssign={canAssign}
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
        bulkAction={panel.bulkAction}
        bulkValue={panel.bulkValue}
        archiveOpen={panel.archiveOpen}
        onBulkActionChange={panel.setBulkAction}
        onBulkValueChange={panel.setBulkValue}
        onArchiveOpenChange={panel.setArchiveOpen}
        onApply={() => void panel.applyBulk()}
        onConfirmArchive={() => void panel.runBulk("archive")}
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
