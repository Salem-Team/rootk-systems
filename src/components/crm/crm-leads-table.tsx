"use client";

import type { Dispatch, SetStateAction } from "react";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CrmLeadContactList } from "@/components/crm/crm-lead-contact-list";
import { CrmLeadRowActions } from "@/components/crm/crm-lead-row-actions";
import { BidiText } from "@/components/shared/bidi-text";
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
import {
  formatBudgetCompact,
  formatRequestCompact,
  type CrmRequestProduct,
} from "@/lib/crm/request-budget-presets";
import { cn } from "@/lib/utils";
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
  someSelected?: boolean;
  hasActiveFilters: boolean;
  onAddLead?: () => void;
  onRowClick: (lead: CrmLead) => void;
  onViewHistory?: (lead: CrmLead) => void;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onClearFilters: () => void;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
}

/** Leads data table body with selection checkboxes and pagination footer. */
export function CrmLeadsTable({
  loading,
  page,
  stageMap,
  employeeMap,
  selected,
  allSelected,
  someSelected = false,
  hasActiveFilters,
  onAddLead,
  onRowClick,
  onViewHistory,
  onToggleAll,
  onToggleOne,
  onClearFilters,
  onFiltersChange,
}: CrmLeadsTableProps) {
  const { t } = useTranslation();
  const items = page.items;
  const openHistory = onViewHistory ?? onRowClick;

  function productLabel(id: CrmRequestProduct) {
    return t(`crm.requestBudget.products.${id}`);
  }

  function requestPreview(raw: string | undefined) {
    return formatRequestCompact(raw ?? "", productLabel);
  }

  function budgetPreview(raw: string | undefined) {
    return formatBudgetCompact(raw ?? "");
  }

  function SelectAllCheckbox({ className }: { className?: string }) {
    return (
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = someSelected;
        }}
        onChange={onToggleAll}
        onClick={(e) => e.stopPropagation()}
        aria-label={
          allSelected ? t("crm.actions.deselectAll") : t("crm.actions.selectAll")
        }
        className={className ?? "h-3.5 w-3.5 accent-primary"}
      />
    );
  }

  // Keep showing current rows while soft-refreshing — never flash a skeleton over real data.
  if (loading && items.length === 0) {
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
      <div className="flex items-center gap-2.5 border-b border-border/50 px-3 py-2 md:hidden">
        <SelectAllCheckbox className="h-4 w-4 accent-primary" />
        <button
          type="button"
          className="min-w-0 flex-1 text-start text-[13px] font-medium text-foreground"
          onClick={onToggleAll}
        >
          {allSelected
            ? t("crm.actions.deselectAll")
            : t("crm.actions.selectAll")}
        </button>
        {selected.size > 0 ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {t("crm.actions.selected", { count: String(selected.size) })}
          </span>
        ) : null}
      </div>

      <ul className="grid gap-2 p-2.5 pb-3 md:hidden">
        {items.map((lead) => {
          const stage = stageMap.get(lead.stageId);
          return (
            <li key={lead.id}>
              <article
                className="flex cursor-pointer gap-2.5 rounded-2xl border border-border/60 bg-card/80 px-3 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] transition-colors touch-manipulation active:bg-muted/40"
                onClick={() => onRowClick(lead)}
              >
                <div
                  className="flex min-h-12 min-w-11 items-start justify-center pt-1"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => onToggleOne(lead.id)}
                    aria-label={lead.name}
                    className="mt-0.5 h-5 w-5 accent-primary"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold leading-snug tracking-tight">
                        <BidiText text={lead.name} />
                      </p>
                      <div
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <CrmLeadContactList lead={lead} compact />
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="max-w-[6.75rem] shrink-0 truncate rounded-full border-border/70 px-2 py-0.5 text-[10px] font-medium"
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
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{t(`crm.source.${lead.source}`)}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">
                      {lead.ownerEmployeeId
                        ? (employeeMap.get(lead.ownerEmployeeId) ??
                          t("crm.leads.unassigned"))
                        : t("crm.leads.unassigned")}
                    </span>
                    {lead.nextFollowUpAt ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">
                          {formatMaybeDate(lead.nextFollowUpAt)}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {(lead.request || lead.budget) ? (
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-muted/40 px-2.5 py-1.5">
                      {lead.budget ? (
                        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-primary">
                          {budgetPreview(lead.budget) || "—"}
                        </span>
                      ) : null}
                      {lead.request ? (
                        <p className="min-w-0 flex-1 truncate text-[11px] leading-snug text-muted-foreground">
                          <BidiText text={requestPreview(lead.request)} />
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/40 pt-2"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        lead.deletedAt
                          ? "text-rose-600 dark:text-rose-400"
                          : lead.status === "active"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                      )}
                    >
                      {lead.deletedAt
                        ? t("crm.status.deleted")
                        : t(`crm.status.${lead.status}`)}
                    </span>
                    <CrmLeadRowActions
                      lead={lead}
                      onViewHistory={openHistory}
                    />
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <div className="hidden md:block">
      <DataTable>
        <DataTableHeader>
          <DataTableHeaderRow>
            <DataTableHead className="w-10">
              <SelectAllCheckbox />
            </DataTableHead>
            <DataTableHead>{t("crm.leads.colLead")}</DataTableHead>
            <DataTableHead className="hidden sm:table-cell">
              {t("crm.leads.colPhone")}
            </DataTableHead>
            <DataTableHead className="max-w-[11rem]">
              {t("crm.leads.colRequest")}
            </DataTableHead>
            <DataTableHead className="w-[5.5rem]">
              {t("crm.leads.colBudget")}
            </DataTableHead>
            <DataTableHead className="hidden md:table-cell">
              {t("crm.leads.colSource")}
            </DataTableHead>
            <DataTableHead className="hidden xl:table-cell">
              {t("crm.leads.colSales")}
            </DataTableHead>
            <DataTableHead>{t("crm.leads.colStage")}</DataTableHead>
            <DataTableHead className="hidden 2xl:table-cell">
              {t("crm.leads.colLastActivity")}
            </DataTableHead>
            <DataTableHead className="hidden xl:table-cell">
              {t("crm.leads.colNextFollowUp")}
            </DataTableHead>
            <DataTableHead className="hidden lg:table-cell">
              {t("crm.leads.colStatus")}
            </DataTableHead>
            <DataTableHead className="w-[7.5rem] text-end">
              {t("crm.leads.colActions")}
            </DataTableHead>
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {items.map((lead) => {
            const stage = stageMap.get(lead.stageId);
            const subStage = (stage?.subStages ?? []).find(
              (s) => s.id === lead.subStageId
            );
            return (
              <DataTableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => onRowClick(lead)}
              >
                <DataTableCell
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => onToggleOne(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={lead.name}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                </DataTableCell>
                <DataTableCell>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      <BidiText text={lead.name} />
                    </p>
                    {lead.companyName ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        <BidiText text={lead.companyName} />
                      </p>
                    ) : null}
                  </div>
                </DataTableCell>
                <DataTableCell
                  className="hidden sm:table-cell"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <CrmLeadContactList lead={lead} compact />
                </DataTableCell>
                <DataTableCell className="max-w-[11rem]">
                  {lead.request ? (
                    <p
                      className="truncate text-[12px] leading-snug text-muted-foreground"
                      title={lead.request}
                    >
                      <BidiText text={requestPreview(lead.request)} />
                    </p>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/50">—</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  {lead.budget ? (
                    <span
                      className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[12px] font-semibold tabular-nums tracking-tight text-primary"
                      title={lead.budget}
                    >
                      {budgetPreview(lead.budget) || "—"}
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/50">—</span>
                  )}
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] md:table-cell">
                  {t(`crm.source.${lead.source}`)}
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] xl:table-cell">
                  {lead.ownerEmployeeId
                    ? (employeeMap.get(lead.ownerEmployeeId) ??
                      t("crm.leads.unassigned"))
                    : t("crm.leads.unassigned")}
                </DataTableCell>
                <DataTableCell>
                  <div className="min-w-0">
                    <Badge
                      variant="outline"
                      className="max-w-[140px] truncate border-border/70 font-normal"
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
                    {subStage ? (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {subStage.name}
                      </p>
                    ) : null}
                  </div>
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] text-muted-foreground 2xl:table-cell">
                  {formatMaybeDate(lead.lastActivityAt)}
                </DataTableCell>
                <DataTableCell className="hidden text-[12px] text-muted-foreground xl:table-cell">
                  {formatMaybeDate(lead.nextFollowUpAt)}
                </DataTableCell>
                <DataTableCell className="hidden lg:table-cell">
                  <span className={cn("text-[12px]", lead.deletedAt && "font-medium text-rose-600 dark:text-rose-400")}>
                    {lead.deletedAt
                      ? t("crm.status.deleted")
                      : t(`crm.status.${lead.status}`)}
                  </span>
                </DataTableCell>
                <DataTableCell
                  className="text-end"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <CrmLeadRowActions
                    lead={lead}
                    onViewHistory={openHistory}
                  />
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      </div>

      {page.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5">
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
              onClick={() =>
                onFiltersChange((prev) => ({ ...prev, page: page.page - 1 }))
              }
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("crm.leads.prev")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page.page >= page.totalPages}
              onClick={() =>
                onFiltersChange((prev) => ({ ...prev, page: page.page + 1 }))
              }
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
