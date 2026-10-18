"use client";

import type { Dispatch, SetStateAction } from "react";
import { FilterShell } from "@/components/shared/filter-shell";
import { LtrNum } from "@/components/shared/ltr-num";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CrmLeadFilterFacets } from "@/lib/crm/lead-filter-facets";
import { emptyLeadFilterFacets } from "@/lib/crm/lead-filter-facets";
import { canFilterCrmByOwner } from "@/lib/crm/lead-filters";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
  CrmFeedbackType,
  CrmFollowUpFilter,
  CrmLeadFilters,
  CrmLeadListStatus,
  CrmLeadSource,
  CrmStage,
} from "@/types/crm";

const SOURCES: CrmLeadSource[] = [
  "facebook",
  "instagram",
  "tiktok",
  "website",
  "whatsapp",
  "referral",
  "organic",
  "advertisement",
  "google",
  "chatgpt",
  "other",
];

const STATUSES: CrmLeadListStatus[] = ["active", "inactive", "archived"];

interface CrmLeadsFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CrmLeadFilters;
  stages: CrmStage[];
  employees: Employee[];
  feedbackTypes?: CrmFeedbackType[];
  canAssign: boolean;
  canViewOthers?: boolean;
  hasActiveFilters: boolean;
  facets?: CrmLeadFilterFacets;
  resultCount?: number;
  /** Hide/lock filter controls the parent owns (e.g. Delay: status + followUp). */
  lockedKeys?: Array<"status" | "followUp">;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
  onClearFilters: () => void;
}

function withCount(label: string, count: number | undefined) {
  if (count == null) return label;
  return `${label} (${count})`;
}

function FilterControls({
  filters,
  stages,
  employees,
  feedbackTypes = [],
  showOwnerFilter,
  hasActiveFilters,
  showDeletedStatus = false,
  facets,
  resultCount,
  lockedKeys,
  stacked,
  onFiltersChange,
  onClearFilters,
}: {
  filters: CrmLeadFilters;
  stages: CrmStage[];
  employees: Employee[];
  feedbackTypes?: CrmFeedbackType[];
  showOwnerFilter: boolean;
  hasActiveFilters: boolean;
  showDeletedStatus?: boolean;
  facets: CrmLeadFilterFacets;
  resultCount?: number;
  lockedKeys?: Array<"status" | "followUp">;
  stacked?: boolean;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  const locked = new Set(lockedKeys ?? []);
  const lossReasons = feedbackTypes.filter(
    (type) => type.active && type.isLossReason
  );
  const lostActive = Boolean(filters.lossReason);
  const triggerClass = stacked
    ? "filter-control h-11 w-full"
    : "filter-control h-11 touch-manipulation text-base sm:h-9 sm:w-[150px] sm:text-sm";

  function setLostFilter(next: string | undefined) {
    onFiltersChange((prev) => ({
      ...prev,
      lossReason: next,
      excludeLost: next ? undefined : prev.excludeLost,
      stageId: next ? undefined : prev.stageId,
      page: 1,
    }));
  }

  return (
    <div className={cn(stacked ? "grid gap-2.5" : "grid gap-2")}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          stacked && "flex-col items-stretch"
        )}
      >
        <Button
          type="button"
          size="sm"
          variant={lostActive ? "destructive" : "outline"}
          className={cn(
            "h-11 touch-manipulation rounded-xl px-3 font-semibold sm:h-9",
            stacked && "w-full",
            !lostActive &&
              "border-rose-300/80 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-500/40 dark:text-rose-300"
          )}
          onClick={() =>
            setLostFilter(lostActive ? undefined : "any")
          }
        >
          {t("crm.filters.lostChip")}
          <LtrNum className="ms-1.5 font-mono text-[12px] tabular-nums">
            {facets.lost}
          </LtrNum>
        </Button>
        {hasActiveFilters ? (
          <div
            className={cn(
              "inline-flex h-11 items-center rounded-xl border border-primary/25 bg-primary/5 px-3 text-[13px] font-semibold text-primary sm:h-9",
              stacked && "w-full justify-center"
            )}
          >
            {t("crm.filters.resultCount", {
              count: String(resultCount ?? facets.total),
            })}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          stacked ? "grid gap-2.5" : "filter-toolbar"
        )}
      >
        <Select
          value={filters.stageId || "all"}
          onValueChange={(v) =>
            onFiltersChange((prev) => ({
              ...prev,
              stageId: v === "all" ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder={t("crm.filters.allStages")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {withCount(t("crm.filters.allStages"), facets.total)}
            </SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {withCount(s.name, facets.byStage[s.id] ?? 0)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!locked.has("status") ? (
          <Select
            value={filters.status || "all"}
            onValueChange={(v) =>
              onFiltersChange((prev) => ({
                ...prev,
                status: v === "all" ? "" : (v as CrmLeadListStatus),
                page: 1,
              }))
            }
          >
            <SelectTrigger className={cn(triggerClass, !stacked && "sm:w-[140px]")}>
              <SelectValue placeholder={t("crm.filters.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {withCount(t("crm.filters.allStatuses"), facets.total)}
              </SelectItem>
              {(showDeletedStatus
                ? [...STATUSES, "deleted" as const]
                : STATUSES
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {withCount(t(`crm.status.${s}`), facets.byStatus[s] ?? 0)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={filters.source || "all"}
          onValueChange={(v) =>
            onFiltersChange((prev) => ({
              ...prev,
              source: v === "all" ? "" : (v as CrmLeadSource),
              page: 1,
            }))
          }
        >
          <SelectTrigger className={cn(triggerClass, !stacked && "sm:w-[140px]")}>
            <SelectValue placeholder={t("crm.filters.allSources")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {withCount(t("crm.filters.allSources"), facets.total)}
            </SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {withCount(t(`crm.source.${s}`), facets.bySource[s] ?? 0)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <SelectTrigger className={cn(triggerClass, !stacked && "sm:w-[160px]")}>
              <SelectValue placeholder={t("crm.filters.byUser")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {withCount(t("crm.filters.allSales"), facets.total)}
              </SelectItem>
              <SelectItem value="__unassigned__">
                {withCount(
                  t("crm.filters.unassigned"),
                  facets.byOwner.__unassigned__ ?? 0
                )}
              </SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {withCount(e.name, facets.byOwner[e.id] ?? 0)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {!locked.has("followUp") ? (
          <Select
            value={filters.followUp || "all"}
            onValueChange={(v) =>
              onFiltersChange((prev) => ({
                ...prev,
                followUp: v === "all" ? "" : (v as CrmFollowUpFilter),
                page: 1,
              }))
            }
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder={t("crm.filters.allFollowUps")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {withCount(
                  t("crm.filters.allFollowUps"),
                  facets.byFollowUp.all ?? facets.total
                )}
              </SelectItem>
              <SelectItem value="today">
                {withCount(
                  t("crm.filters.followUpToday"),
                  facets.byFollowUp.today ?? 0
                )}
              </SelectItem>
              <SelectItem value="upcoming">
                {withCount(
                  t("crm.filters.followUpUpcoming"),
                  facets.byFollowUp.upcoming ?? 0
                )}
              </SelectItem>
              <SelectItem value="overdue">
                {withCount(
                  t("crm.filters.followUpOverdue"),
                  facets.byFollowUp.overdue ?? 0
                )}
              </SelectItem>
              <SelectItem value="none">
                {withCount(
                  t("crm.filters.followUpNone"),
                  facets.byFollowUp.none ?? 0
                )}
              </SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={filters.lossReason || "all"}
          onValueChange={(v) =>
            setLostFilter(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger
            className={cn(
              triggerClass,
              !stacked && "sm:w-[170px]",
              lostActive &&
                "border-rose-400/80 text-rose-700 dark:border-rose-500/50 dark:text-rose-300"
            )}
          >
            <SelectValue placeholder={t("crm.filters.lostChip")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("crm.filters.noLostFilter")}</SelectItem>
            <SelectItem value="any">
              {withCount(t("crm.filters.anyLost"), facets.byLossReason.any ?? 0)}
            </SelectItem>
            {lossReasons.map((reason) => (
              <SelectItem key={reason.id} value={reason.id}>
                {withCount(reason.name, facets.byLossReason[reason.id] ?? 0)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort ?? "createdAt"}
          onValueChange={(v) =>
            onFiltersChange((prev) => ({
              ...prev,
              sort: v as CrmLeadFilters["sort"],
              page: 1,
            }))
          }
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder={t("crm.filters.sort")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t("crm.leads.sortCreated")}</SelectItem>
            <SelectItem value="updatedAt">{t("crm.leads.sortUpdated")}</SelectItem>
            <SelectItem value="name">{t("crm.leads.sortName")}</SelectItem>
            <SelectItem value="nextFollowUpAt">
              {t("crm.leads.sortFollowUp")}
            </SelectItem>
            <SelectItem value="lastActivityAt">
              {t("crm.leads.sortActivity")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.order ?? "desc"}
          onValueChange={(v) =>
            onFiltersChange((prev) => ({
              ...prev,
              order: v as "asc" | "desc",
              page: 1,
            }))
          }
        >
          <SelectTrigger className={cn(triggerClass, !stacked && "sm:w-[130px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">{t("crm.filters.desc")}</SelectItem>
            <SelectItem value="asc">{t("crm.filters.asc")}</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            type="button"
            size="sm"
            variant={stacked ? "outline" : "ghost"}
            className={cn(stacked && "min-h-11 w-full")}
            onClick={onClearFilters}
          >
            {t("crm.actions.clearFilters")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Filter bar for the leads table: sheet on mobile, inline toolbar on desktop. */
export function CrmLeadsFilters({
  open,
  onOpenChange,
  filters,
  stages,
  employees,
  feedbackTypes = [],
  canAssign,
  canViewOthers = false,
  hasActiveFilters,
  facets = emptyLeadFilterFacets(),
  resultCount,
  lockedKeys,
  onFiltersChange,
  onClearFilters,
}: CrmLeadsFiltersProps) {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const showOwnerFilter = canFilterCrmByOwner({ canAssign, canViewOthers });
  const showDeletedStatus = role === "admin";

  const controls = (
    <FilterControls
      filters={filters}
      stages={stages}
      employees={employees}
      feedbackTypes={feedbackTypes}
      showOwnerFilter={showOwnerFilter}
      hasActiveFilters={hasActiveFilters}
      showDeletedStatus={showDeletedStatus}
      facets={facets}
      resultCount={resultCount}
      lockedKeys={lockedKeys}
      onFiltersChange={onFiltersChange}
      onClearFilters={onClearFilters}
    />
  );

  return (
    <>
      <FilterShell
        compact
        className="hidden rounded-none border-x-0 border-t-0 shadow-none lg:block"
      >
        {controls}
      </FilterShell>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={cn(
            "inset-x-0 bottom-0 top-auto h-auto max-h-[min(88dvh,40rem)] max-w-none gap-0 rounded-t-2xl border-s-0 border-t p-0",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "rtl:data-[state=closed]:slide-out-to-bottom rtl:data-[state=open]:slide-in-from-bottom"
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border/80" aria-hidden />
          <SheetHeader className="border-b border-border/60 px-4 py-3 pe-14">
            <SheetTitle>{t("crm.filters.title")}</SheetTitle>
            <SheetDescription>{t("crm.filters.sheetHint")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            <FilterControls
              filters={filters}
              stages={stages}
              employees={employees}
              feedbackTypes={feedbackTypes}
              showOwnerFilter={showOwnerFilter}
              hasActiveFilters={hasActiveFilters}
              lockedKeys={lockedKeys}
              facets={facets}
              resultCount={resultCount}
              stacked
              onFiltersChange={onFiltersChange}
              onClearFilters={onClearFilters}
            />
          </div>
          <div className="shrink-0 border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="min-h-11 w-full touch-manipulation"
              onClick={() => onOpenChange(false)}
            >
              {t("crm.filters.done")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
