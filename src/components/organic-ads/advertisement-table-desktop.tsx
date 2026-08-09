"use client";

import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { AdStatusBadge } from "@/components/organic-ads/ad-status-badge";
import { AdvertisementRowMenu } from "@/components/organic-ads/advertisement-row-menu";
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
import type { AdStatus, OrganicAdvertisement } from "@/types/organic-ads";

export function AdvertisementTableDesktop({
  ads,
  nameMap,
  onView,
  onEditStatus,
  onDelete,
}: {
  ads: OrganicAdvertisement[];
  nameMap: Map<string, string>;
  onView: (ad: OrganicAdvertisement) => void;
  onEditStatus: (ad: OrganicAdvertisement, status: AdStatus) => void;
  onDelete: (ad: OrganicAdvertisement) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="hidden md:block">
      <DataTable>
        <DataTableHeader>
          <DataTableHeaderRow>
            <DataTableHead>{t("organicAds.list.colAd")}</DataTableHead>
            <DataTableHead>{t("organicAds.list.colSales")}</DataTableHead>
            <DataTableHead>{t("organicAds.list.colPlatform")}</DataTableHead>
            <DataTableHead>{t("organicAds.list.colProject")}</DataTableHead>
            <DataTableHead>{t("organicAds.list.colStatus")}</DataTableHead>
            <DataTableHead>{t("organicAds.list.colAdded")}</DataTableHead>
            <DataTableHead className="w-24" />
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {ads.map((ad) => (
            <DataTableRow key={ad.id}>
              <DataTableCell>
                <button
                  type="button"
                  onClick={() => onView(ad)}
                  className="max-w-[240px] truncate text-start text-[13px] font-medium hover:underline"
                >
                  {ad.project ||
                    t(`organicAds.adType.${ad.adType}`) +
                      " · " +
                      t(`organicAds.platform.${ad.platform}`)}
                </button>
              </DataTableCell>
              <DataTableCell className="text-[13px]">
                {nameMap.get(ad.ownerEmployeeId) ?? ad.ownerEmployeeId}
              </DataTableCell>
              <DataTableCell className="text-[13px]">
                {t(`organicAds.platform.${ad.platform}`)}
              </DataTableCell>
              <DataTableCell className="text-[13px]">
                {ad.project || "—"}
              </DataTableCell>
              <DataTableCell>
                <AdStatusBadge status={ad.status} />
              </DataTableCell>
              <DataTableCell className="text-[12px] text-muted-foreground">
                {format(new Date(ad.addedAt), "MMM d, yyyy")}
              </DataTableCell>
              <DataTableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                    <a
                      href={ad.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("organicAds.actions.open")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <AdvertisementRowMenu
                    ad={ad}
                    onView={onView}
                    onEditStatus={onEditStatus}
                    onDelete={onDelete}
                  />
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
