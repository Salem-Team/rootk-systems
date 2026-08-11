"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  CrmFollowUpFilter,
  CrmLeadFilters,
  CrmLeadSource,
  CrmLeadStatus,
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
  "other",
];

const STATUSES: CrmLeadStatus[] = ["active", "inactive", "archived"];

interface CrmLeadsFiltersProps {
  open: boolean;
  filters: CrmLeadFilters;
  stages: CrmStage[];
  employees: Employee[];
  canAssign: boolean;
  hasActiveFilters: boolean;
  onFiltersChange: (filters: CrmLeadFilters) => void;
  onClearFilters: () => void;
}

/** Filter bar for the leads table: stage/status/source/owner/follow-up/sort. */
export function CrmLeadsFilters({
  open,
  filters,
  stages,
  employees,
  canAssign,
  hasActiveFilters,
  onFiltersChange,
  onClearFilters,
}: CrmLeadsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "filter-toolbar border-b border-border/60 px-3 py-3 lg:flex",
        open ? "flex" : "hidden lg:flex"
      )}
    >
      <Select
        value={filters.stageId || "all"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            stageId: v === "all" ? undefined : v,
            page: 1,
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[150px]">
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

      <Select
        value={filters.status || "all"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            status: v === "all" ? "" : (v as CrmLeadStatus),
            page: 1,
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[140px]">
          <SelectValue placeholder={t("crm.filters.allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("crm.filters.allStatuses")}</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`crm.status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.source || "all"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            source: v === "all" ? "" : (v as CrmLeadSource),
            page: 1,
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[140px]">
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

      {canAssign ? (
        <Select
          value={filters.ownerEmployeeId || "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              ownerEmployeeId: v === "all" ? undefined : v,
              page: 1,
            })
          }
        >
          <SelectTrigger className="filter-control h-9 sm:w-[160px]">
            <SelectValue placeholder={t("crm.filters.allSales")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("crm.filters.allSales")}</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={filters.followUp || "all"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            followUp: v === "all" ? "" : (v as CrmFollowUpFilter),
            page: 1,
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[150px]">
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

      <Select
        value={filters.sort ?? "updatedAt"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            sort: v as CrmLeadFilters["sort"],
            page: 1,
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[150px]">
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
          onFiltersChange({
            ...filters,
            order: v as "asc" | "desc",
            page: 1,
          })
        }
      >
        <SelectTrigger className="filter-control h-9 sm:w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">{t("crm.filters.desc")}</SelectItem>
          <SelectItem value="asc">{t("crm.filters.asc")}</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button type="button" size="sm" variant="ghost" onClick={onClearFilters}>
          {t("crm.actions.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
