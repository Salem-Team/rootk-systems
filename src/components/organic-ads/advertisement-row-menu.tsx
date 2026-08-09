"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/use-translation";
import type { AdStatus, OrganicAdvertisement } from "@/types/organic-ads";

export function AdvertisementRowMenu({
  ad,
  onView,
  onEditStatus,
  onDelete,
}: {
  ad: OrganicAdvertisement;
  onView: (ad: OrganicAdvertisement) => void;
  onEditStatus: (ad: OrganicAdvertisement, status: AdStatus) => void;
  onDelete: (ad: OrganicAdvertisement) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(ad)}>
          {t("organicAds.actions.view")}
        </DropdownMenuItem>
        {ad.status === "active" ? (
          <DropdownMenuItem onClick={() => onEditStatus(ad, "inactive")}>
            {t("organicAds.actions.markInactive")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onEditStatus(ad, "active")}>
            {t("organicAds.actions.markActive")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(ad)}
        >
          {t("organicAds.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
