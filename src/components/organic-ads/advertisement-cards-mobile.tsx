"use client";

import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { AdStatusBadge } from "@/components/organic-ads/ad-status-badge";
import { AdvertisementRowMenu } from "@/components/organic-ads/advertisement-row-menu";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { AdStatus, OrganicAdvertisement } from "@/types/organic-ads";

export function AdvertisementCardsMobile({
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
    <ul className="grid gap-2 p-3 md:hidden">
      {ads.map((ad) => (
        <li
          key={ad.id}
          className="rounded-xl border border-border/70 bg-card px-3 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onView(ad)}
              className="min-w-0 text-start"
            >
              <p className="truncate text-[13px] font-semibold">
                {ad.project || t(`organicAds.platform.${ad.platform}`)}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {nameMap.get(ad.ownerEmployeeId)} ·{" "}
                {t(`organicAds.platform.${ad.platform}`)}
              </p>
            </button>
            <AdStatusBadge status={ad.status} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(ad.addedAt), "MMM d, yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <Button asChild size="sm" variant="ghost">
                <a href={ad.url} target="_blank" rel="noopener noreferrer">
                  {t("organicAds.actions.open")}
                  <ExternalLink className="ms-1 h-3 w-3" />
                </a>
              </Button>
              <AdvertisementRowMenu
                ad={ad}
                onView={onView}
                onEditStatus={onEditStatus}
                onDelete={onDelete}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
