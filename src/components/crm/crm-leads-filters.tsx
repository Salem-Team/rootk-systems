"use client";

import type { Dispatch, SetStateAction } from "react";
import { FilterShell } from "@/components/shared/filter-shell";
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
import { canFilterCrmByOwner } from "@/lib/crm/lead-filters";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
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
  canAssign: boolean;
  canViewOthers?: boolean;
  hasActiveFilters: boolean;
  /** Hide/lock filter controls the parent owns (e.g. Delay: status + followUp). */
  lockedKeys?: Array<"status" | "followUp">;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
  onClearFilters: () => void;
}

function FilterControls({
  filters,
  stages,
  employees,
  showOwnerFilter,
  hasActiveFilters,
  showDeletedStatus = false,
  lockedKeys,
  stacked,
  onFiltersChange,
  onClearFilters,
}: {
  filters: CrmLeadFilters;
  stages: CrmStage[];
  employees: Employee[];
  showOwnerFilter: boolean;
  hasActiveFilters: boolean;
  showDeletedStatus?: boolean;
  lockedKeys?: Array<"status" | "followUp">;
  stacked?: boolean;
  onFiltersChange: Dispatch<SetStateAction<CrmLeadFilters>>;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  const locked = new Set(lockedKeys ?? []);
  const triggerClass = stacked
    ? "filter-control h-11 w-full"
    : "filter-control h-11 touch-manipulation text-base sm:h-9 sm:w-[150px] sm:text-sm";

  return (
    <div
      className={cn(
        stacked
          ? "grid gap-2.5"
          : "filter-toolbar"
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
          <SelectItem value="all">{t("crm.filters.allStages")}</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
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
          <SelectItem value="all">{t("crm.filters.allStatuses")}</SelectItem>
          {(showDeletedStatus ? [...STATUSES, "deleted" as const] : STATUSES).map(
            (s) => (
              <SelectItem key={s} value={s}>
                {t(`crm.status.${s}`)}
              </SelectItem>
            )
          )}
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
          <SelectItem value="all">{t("crm.filters.allSources")}</SelectItem>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`crm.source.${s}`)}
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
            <SelectItem value="all">{t("crm.filters.allSales")}</SelectItem>
            <SelectItem value="__unassigned__">
              {t("crm.filters.unassigned")}
            </SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
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
          <SelectItem value="all">{t("crm.filters.allFollowUps")}</SelectItem>
          <SelectItem value="today">{t("crm.filters.followUpToday")}</SelectItem>
          <SelectItem value="upcoming">
            {t("crm.filters.followUpUpcoming")}
          </SelectItem>
          <SelectItem value="overdue">
            {t("crm.filters.followUpOverdue")}
          </SelectItem>
          <SelectItem value="none">{t("crm.filters.followUpNone")}</SelectItem>
        </SelectContent>
      </Select>
      ) : null}

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
  );
}

/** Filter bar for the leads table: sheet on mobile, inline toolbar on desktop. */
export function CrmLeadsFilters({
  open,
  onOpenChange,
  filters,
  stages,
  employees,
  canAssign,
  canViewOthers = false,
  hasActiveFilters,
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
      showOwnerFilter={showOwnerFilter}
      hasActiveFilters={hasActiveFilters}
      showDeletedStatus={showDeletedStatus}
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
              showOwnerFilter={showOwnerFilter}
              hasActiveFilters={hasActiveFilters}
              lockedKeys={lockedKeys}
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
