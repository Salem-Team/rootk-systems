"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { AdStatusBadge, AdValidationBadge } from "@/components/organic-ads/ad-status-badge";
import { useTranslation } from "@/hooks/use-translation";
import type { OrganicAdvertisement } from "@/types/organic-ads";

interface ValidationPanelProps {
  ads: OrganicAdvertisement[];
  employeeNames: Map<string, string>;
  onView: (ad: OrganicAdvertisement) => void;
}

export function ValidationPanel({
  ads,
  employeeNames,
  onView,
}: ValidationPanelProps) {
  const { t } = useTranslation();

  const duplicates = ads.filter(
    (a) => a.status === "duplicate" || !!a.duplicateOfId
  );
  const invalid = ads.filter(
    (a) =>
      a.validationStatus === "invalid" ||
      a.validationStatus === "broken" ||
      a.validationStatus === "unsupported"
  );
  const needsReview = ads.filter((a) => a.status === "needs_review");

  const sections = [
    {
      key: "duplicates",
      title: t("organicAds.validation.duplicates"),
      items: duplicates,
    },
    {
      key: "invalid",
      title: t("organicAds.validation.invalid"),
      items: invalid,
    },
    {
      key: "review",
      title: t("organicAds.validation.needsReview"),
      items: needsReview,
    },
  ] as const;

  const total =
    duplicates.length + invalid.length + needsReview.length;

  return (
    <section className="surface-panel">
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {t("organicAds.validation.title")}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("organicAds.validation.subtitle")}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="p-4">
          <EmptyState
            title={t("organicAds.validation.empty")}
            description={t("organicAds.validation.emptyDesc")}
          />
        </div>
      ) : (
        <div className="grid gap-5 p-4">
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.key}>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {section.title} ({section.items.length})
                </h3>
                <ul className="grid gap-2">
                  {section.items.map((ad) => (
                    <li key={`${section.key}-${ad.id}`}>
                      <button
                        type="button"
                        onClick={() => onView(ad)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/65 px-3 py-2.5 text-start hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">
                            {employeeNames.get(ad.ownerEmployeeId) ??
                              ad.ownerEmployeeId}{" "}
                            · {t(`organicAds.platform.${ad.platform}`)}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {ad.url}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <AdStatusBadge status={ad.status} />
                          <AdValidationBadge status={ad.validationStatus} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
