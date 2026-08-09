"use client";

import { Check, ExternalLink, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AdStatusBadge, AdValidationBadge } from "@/components/organic-ads/ad-status-badge";
import { useTranslation } from "@/hooks/use-translation";
import type { OrganicAdvertisement } from "@/types/organic-ads";

interface AdvertisementDetailsSheetProps {
  ad: OrganicAdvertisement | null;
  ownerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CheckRow({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      ) : (
        <X className="h-3.5 w-3.5 text-rose-600" aria-hidden />
      )}
      <span>{label}</span>
    </li>
  );
}

export function AdvertisementDetailsSheet({
  ad,
  ownerName,
  open,
  onOpenChange,
}: AdvertisementDetailsSheetProps) {
  const { t } = useTranslation();
  if (!ad) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("organicAds.details.title")}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 grid gap-5">
          <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                {t("organicAds.details.platform")}
              </dt>
              <dd className="mt-0.5 font-medium">
                {t(`organicAds.platform.${ad.platform}`)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("organicAds.details.type")}
              </dt>
              <dd className="mt-0.5 font-medium">
                {t(`organicAds.adType.${ad.adType}`)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("organicAds.details.addedBy")}
              </dt>
              <dd className="mt-0.5 font-medium">
                {ownerName ?? ad.ownerEmployeeId}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("organicAds.details.created")}
              </dt>
              <dd className="mt-0.5 font-medium">
                {new Date(ad.addedAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("organicAds.details.project")}
              </dt>
              <dd className="mt-0.5 font-medium">{ad.project || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("organicAds.details.status")}
              </dt>
              <dd className="mt-1">
                <AdStatusBadge status={ad.status} />
              </dd>
            </div>
          </dl>

          <section>
            <h3 className="text-sm font-semibold">
              {t("organicAds.details.originalLink")}
            </h3>
            <p className="mt-1 break-all text-[12px] text-muted-foreground">
              {ad.url}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <a href={ad.url} target="_blank" rel="noopener noreferrer">
                {t("organicAds.details.openAd")}
                <ExternalLink className="ms-1.5 h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          </section>

          <section>
            <h3 className="text-sm font-semibold">
              {t("organicAds.details.performance")}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {t("organicAds.details.performanceUnavailable")}
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {t("organicAds.details.validation")}
              </h3>
              <AdValidationBadge status={ad.validationStatus} />
            </div>
            <ul className="grid gap-1.5">
              <CheckRow
                ok={ad.validationStatus === "valid"}
                label={t("organicAds.details.validUrl")}
              />
              <CheckRow
                ok={ad.platform !== "unknown" && ad.platform !== "other"}
                label={t("organicAds.details.platformOk")}
              />
              <CheckRow
                ok={!ad.duplicateOfId && ad.status !== "duplicate"}
                label={t("organicAds.details.noDuplicate")}
              />
              <CheckRow
                ok={
                  ad.validationStatus === "valid" ||
                  ad.validationStatus === "pending"
                }
                label={t("organicAds.details.accessible")}
              />
            </ul>
          </section>

          {ad.notes ? (
            <section>
              <h3 className="text-sm font-semibold">
                {t("organicAds.details.notes")}
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {ad.notes}
              </p>
            </section>
          ) : null}

          {ad.workTaskId || ad.targetId ? (
            <section className="rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-[13px]">
              {ad.workTaskId ? (
                <p>
                  <span className="text-muted-foreground">
                    {t("organicAds.details.linkedTask")}:
                  </span>{" "}
                  <span className="font-mono text-[12px]">{ad.workTaskId}</span>
                </p>
              ) : null}
              {ad.targetId ? (
                <p className={ad.workTaskId ? "mt-1" : undefined}>
                  <span className="text-muted-foreground">
                    {t("organicAds.details.linkedTarget")}:
                  </span>{" "}
                  <span className="font-mono text-[12px]">{ad.targetId}</span>
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
