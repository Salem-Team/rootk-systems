"use client";

import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmLead, CrmLeadFilters, CrmStage, PaginatedLeads } from "@/types/crm";

function formatMaybeDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy");
  } catch {
    return value;
  }
}

interface CrmLeadsTableProps {
  loading: boolean;
  page: PaginatedLeads;
  filters: CrmLeadFilters;
  stageMap: Map<string, CrmStage>;
  employeeMap: Map<string, string>;
  selected: Set<string>;
  allSelected: boolean;
  hasActiveFilters: boolean;
  onAddLead?: () => void;
  onRowClick: (lead: CrmLead) => void;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onClearFilters: () => void;
  onFiltersChange: (filters: CrmLeadFilters) => void;
}

/** Leads data table body with selection checkboxes and pagination footer. */
export function CrmLeadsTable({
  loading,
  page,
  filters,
  stageMap,
  employeeMap,
  selected,
  allSelected,
  hasActiveFilters,
  onAddLead,
  onRowClick,
  onToggleAll,
  onToggleOne,
  onClearFilters,
  onFiltersChange,
}: CrmLeadsTableProps) {
  const { t } = useTranslation();
  const items = page.items;

  if (loading) {
    return (
      <div className="p-3">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("crm.empty.leads")}
          description={t("crm.empty.leadsDesc")}
          actionLabel={
            hasActiveFilters
              ? t("crm.actions.clearFilters")
              : onAddLead
                ? t("crm.actions.addLead")
                : undefined
          }
          onAction={
            hasActiveFilters ? onClearFilters : onAddLead ? onAddLead : undefined
          }
        />
      </div>
    );
  }

  return (
    <>
      <DataTable>
        <DataTableHeader>
          <DataTableHeaderRow>
            <DataTableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={t("crm.actions.selected", {
                  count: String(items.length),
                })}
                className="h-3.5 w-3.5 accent-primary"
              />
            </DataTableHead>
            <DataTableHead>{t("crm.leads.colLead")}</DataTableHead>
            <DataTableHead className="hidden sm:table-cell">
              {t("crm.leads.colPhone")}
            </DataTableHead>
            <DataTableHead className="hidden md:table-cell">
              {t("crm.leads.colSource")}
            </DataTableHead>
            <DataTableHead className="hidden lg:table-cell">
              {t("crm.leads.colSales")}
            </DataTableHead>
            <DataTableHead>{t("crm.leads.colStage")}</DataTableHead>
            <DataTableHead className="hidden xl:table-cell">
              {t("crm.leads.colLastActivity")}
            </DataTableHead>
            <DataTableHead className="hidden lg:table-cell">
              {t("crm.leads.colNextFollowUp")}
            </DataTableHead>
            <DataTableHead>{t("crm.leads.colStatus")}</DataTableHead>
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {items.map((lead) => {
            const stage = stageMap.get(lead.stageId);
            return (
              <DataTableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => onRowClick(lead)}
              >
                <DataTableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => onToggleOne(lead.id)}
                    aria-label={lead.name}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                </DataTableCell>
                <DataTableCell>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {lead.name}
                    </p>
                    {lead.companyName ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lead.companyName}
                      </p>
                    ) : null}
                  </div>
                </DataTableCell>
                <DataTableCell className="hidden font-mono text-[12px] sm:table-cell">
                  {lead.phone}
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] md:table-cell">
                  {t(`crm.source.${lead.source}`)}
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] lg:table-cell">
                  {lead.ownerEmployeeId
                    ? (employeeMap.get(lead.ownerEmployeeId) ??
                      t("crm.leads.unassigned"))
                    : t("crm.leads.unassigned")}
                </DataTableCell>
                <DataTableCell>
                  <Badge
                    variant="outline"
                    className="max-w-[120px] truncate border-border/70 font-normal"
                    style={
                      stage?.color
                        ? {
                            borderColor: `${stage.color}55`,
                            color: stage.color,
                          }
                        : undefined
                    }
                  >
                    {stage?.name ?? "—"}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] text-muted-foreground xl:table-cell">
                  {formatMaybeDate(lead.lastActivityAt)}
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] text-muted-foreground lg:table-cell">
                  {formatMaybeDate(lead.nextFollowUpAt)}
                </DataTableCell>
                <DataTableCell>
                  <span className="text-[12px]">
                    {t(`crm.status.${lead.status}`)}
                  </span>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>

      {page.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5">
          <p className="text-[12px] text-muted-foreground">
            {t("crm.leads.pageOf", {
              page: String(page.page),
              total: String(page.totalPages),
            })}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page.page <= 1}
              onClick={() => onFiltersChange({ ...filters, page: page.page - 1 })}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("crm.leads.prev")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page.page >= page.totalPages}
              onClick={() => onFiltersChange({ ...filters, page: page.page + 1 })}
            >
              {t("crm.leads.next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
