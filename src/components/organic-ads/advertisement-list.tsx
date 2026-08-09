"use client";

import { useMemo, useState } from "react";
import { AdvertisementCardsMobile } from "@/components/organic-ads/advertisement-cards-mobile";
import { AdvertisementFiltersBar } from "@/components/organic-ads/advertisement-filters-bar";
import { AdvertisementTableDesktop } from "@/components/organic-ads/advertisement-table-desktop";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type {
  AdStatus,
  OrganicAdsFilters,
  OrganicAdvertisement,
} from "@/types/organic-ads";

interface AdvertisementListProps {
  ads: OrganicAdvertisement[];
  employees: Employee[];
  filters: OrganicAdsFilters;
  onFiltersChange: (filters: OrganicAdsFilters) => void;
  onView: (ad: OrganicAdvertisement) => void;
  onEditStatus: (ad: OrganicAdvertisement, status: AdStatus) => void;
  onDelete: (ad: OrganicAdvertisement) => void;
  onAdd: () => void;
  canManageTeam?: boolean;
}

export function AdvertisementList({
  ads,
  employees,
  filters,
  onFiltersChange,
  onView,
  onEditStatus,
  onDelete,
  onAdd,
  canManageTeam = false,
}: AdvertisementListProps) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const nameMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees]
  );

  const owners = useMemo(() => {
    const ids = new Set(ads.map((a) => a.ownerEmployeeId));
    return employees.filter((e) => ids.has(e.id));
  }, [ads, employees]);

  return (
    <section className="surface-panel">
      <AdvertisementFiltersBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        owners={owners}
        canManageTeam={canManageTeam}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
      />

      {ads.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title={t("organicAds.list.empty")}
            description={t("organicAds.list.emptyDesc")}
            actionLabel={t("organicAds.actions.add")}
            onAction={onAdd}
          />
        </div>
      ) : (
        <>
          <AdvertisementTableDesktop
            ads={ads}
            nameMap={nameMap}
            onView={onView}
            onEditStatus={onEditStatus}
            onDelete={onDelete}
          />
          <AdvertisementCardsMobile
            ads={ads}
            nameMap={nameMap}
            onView={onView}
            onEditStatus={onEditStatus}
            onDelete={onDelete}
          />
        </>
      )}
    </section>
  );
}
