"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AdPlatform,
  AdStatus,
  AdValidationStatus,
  OrganicAdsFilters,
} from "@/types/organic-ads";

export function AdvertisementFiltersBar({
  filters,
  onFiltersChange,
  owners,
  canManageTeam,
  filtersOpen,
  onFiltersOpenChange,
}: {
  filters: OrganicAdsFilters;
  onFiltersChange: (filters: OrganicAdsFilters) => void;
  owners: Employee[];
  canManageTeam: boolean;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="panel-header flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("organicAds.list.title")}
        </h2>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search ?? ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value, page: 1 })
              }
              placeholder={t("organicAds.list.search")}
              className="h-9 w-full ps-8 sm:w-[220px]"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="lg:hidden"
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <SlidersHorizontal className="me-1.5 h-3.5 w-3.5" />
            {t("organicAds.list.filters")}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "filter-toolbar border-b border-border/60 px-3 py-3 lg:flex",
          filtersOpen ? "flex" : "hidden lg:flex"
        )}
      >
        {canManageTeam ? (
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
              <SelectValue placeholder={t("organicAds.list.allSales")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("organicAds.list.allSales")}</SelectItem>
              {owners.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={filters.platform || "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              platform: v === "all" ? "" : (v as AdPlatform),
              page: 1,
            })
          }
        >
          <SelectTrigger className="filter-control h-9 sm:w-[150px]">
            <SelectValue placeholder={t("organicAds.list.allPlatforms")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("organicAds.list.allPlatforms")}
            </SelectItem>
            {(
              [
                "facebook",
                "instagram",
                "tiktok",
                "linkedin",
                "other",
              ] as AdPlatform[]
            ).map((p) => (
              <SelectItem key={p} value={p}>
                {t(`organicAds.platform.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              status: v === "all" ? "" : (v as AdStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger className="filter-control h-9 sm:w-[150px]">
            <SelectValue placeholder={t("organicAds.list.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("organicAds.list.allStatuses")}
            </SelectItem>
            {(
              ["active", "inactive", "needs_review", "duplicate"] as AdStatus[]
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`organicAds.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.validationStatus || "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              validationStatus:
                v === "all" ? "" : (v as AdValidationStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger className="filter-control h-9 sm:w-[160px]">
            <SelectValue placeholder={t("organicAds.list.allValidation")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("organicAds.list.allValidation")}
            </SelectItem>
            {(
              [
                "valid",
                "invalid",
                "broken",
                "unsupported",
                "pending",
              ] as AdValidationStatus[]
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`organicAds.validationStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          variant={filters.duplicateOnly ? "secondary" : "outline"}
          onClick={() =>
            onFiltersChange({
              ...filters,
              duplicateOnly: !filters.duplicateOnly,
              page: 1,
            })
          }
        >
          {t("organicAds.list.duplicatesOnly")}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            onFiltersChange({
              search: "",
              page: 1,
              pageSize: filters.pageSize,
            })
          }
        >
          {t("organicAds.list.clearFilters")}
        </Button>
      </div>
    </>
  );
}
