"use client";

import { EmptyState } from "@/components/shared/empty-state";
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
import { cn } from "@/lib/utils";
import type {
  SalesAdvertisingProfile,
  SalesPerformanceRow,
} from "@/types/organic-ads";
import { AdStatusBadge } from "@/components/organic-ads/ad-status-badge";
import { format } from "date-fns";

interface SalesPerformancePanelProps {
  rows: SalesPerformanceRow[];
  profile: SalesAdvertisingProfile | null;
  onSelectEmployee: (employeeId: string) => void;
  onClearProfile: () => void;
  onViewAd: (adId: string) => void;
}

export function SalesPerformancePanel({
  rows,
  profile,
  onSelectEmployee,
  onClearProfile,
  onViewAd,
}: SalesPerformancePanelProps) {
  const { t } = useTranslation();

  if (profile) {
    return (
      <section className="surface-panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="section-label text-primary/70">
              {t("organicAds.performance.profileTitle")}
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight">
              {profile.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClearProfile}
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            ← {t("organicAds.performance.title")}
          </button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-4">
          {[
            {
              label: t("organicAds.performance.ads"),
              value: profile.totalAds,
            },
            {
              label: t("organicAds.performance.active"),
              value: profile.activeAds,
            },
            {
              label: t("organicAds.performance.platforms"),
              value: profile.platformsUsed,
            },
            {
              label: t("organicAds.performance.thisWeek"),
              value: profile.adsThisWeek,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/70 px-3 py-2.5"
            >
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 border-t border-border/60 p-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">
              {t("organicAds.health.title")}
            </h3>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
              {profile.healthScore}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {t("organicAds.health.of")} 100
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  profile.healthScore >= 70
                    ? "bg-emerald-600"
                    : profile.healthScore >= 40
                      ? "bg-amber-500"
                      : "bg-rose-500"
                )}
                style={{ width: `${profile.healthScore}%` }}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              {t("organicAds.performance.platformMix")}
            </h3>
            <ul className="mt-2 grid gap-1.5">
              {profile.platformCounts.map((p) => (
                <li
                  key={p.platform}
                  className="flex items-center justify-between text-[13px]"
                >
                  <span>{t(`organicAds.platform.${p.platform}`)}</span>
                  <span className="font-mono tabular-nums">{p.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {profile.linkedTargets && profile.linkedTargets.length > 0 ? (
          <div className="border-t border-border/60 p-4">
            <h3 className="text-sm font-semibold">
              {t("organicAds.linkedTargets.title")}
            </h3>
            <ul className="mt-2 grid gap-2">
              {profile.linkedTargets.map((target) => (
                <li
                  key={target.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-[13px]"
                >
                  <span className="min-w-0 truncate font-medium">
                    {target.title}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {target.completedQuantity}/{target.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="border-t border-border/60 p-4">
          <h3 className="text-sm font-semibold">
            {t("organicAds.performance.recent")}
          </h3>
          <ul className="mt-3 grid gap-2">
            {profile.recentAds.map((ad) => (
              <li key={ad.id}>
                <button
                  type="button"
                  onClick={() => onViewAd(ad.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-start hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {t(`organicAds.platform.${ad.platform}`)} ·{" "}
                      {t(`organicAds.adType.${ad.adType}`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(ad.addedAt), "MMM d, yyyy")}
                      {ad.project ? ` · ${ad.project}` : ""}
                    </p>
                  </div>
                  <AdStatusBadge status={ad.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-panel">
      <div className="panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("organicAds.performance.title")}
        </h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title={t("organicAds.performance.empty")}
            description={t("organicAds.performance.emptyDesc")}
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable>
              <DataTableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>
                    {t("organicAds.performance.colSales")}
                  </DataTableHead>
                  <DataTableHead>
                    {t("organicAds.performance.colAds")}
                  </DataTableHead>
                  <DataTableHead>
                    {t("organicAds.performance.colActive")}
                  </DataTableHead>
                  <DataTableHead>
                    {t("organicAds.performance.colPlatforms")}
                  </DataTableHead>
                  <DataTableHead>
                    {t("organicAds.performance.colWeek")}
                  </DataTableHead>
                  <DataTableHead>
                    {t("organicAds.performance.colHealth")}
                  </DataTableHead>
                  <DataTableHead>
                    {t("organicAds.performance.colLast")}
                  </DataTableHead>
                </DataTableHeaderRow>
              </DataTableHeader>
              <DataTableBody>
                {rows.map((row) => (
                  <DataTableRow key={row.employeeId}>
                    <DataTableCell>
                      <button
                        type="button"
                        onClick={() => onSelectEmployee(row.employeeId)}
                        className="font-medium hover:underline"
                      >
                        {row.name}
                      </button>
                    </DataTableCell>
                    <DataTableCell className="font-mono tabular-nums">
                      {row.ads}
                    </DataTableCell>
                    <DataTableCell className="font-mono tabular-nums">
                      {row.active}
                    </DataTableCell>
                    <DataTableCell className="font-mono tabular-nums">
                      {row.platforms}
                    </DataTableCell>
                    <DataTableCell className="font-mono tabular-nums">
                      {row.weeklyCount}/{row.weeklyTarget}
                    </DataTableCell>
                    <DataTableCell className="font-mono tabular-nums">
                      {row.healthScore}
                    </DataTableCell>
                    <DataTableCell className="text-[12px] text-muted-foreground">
                      {row.lastActivityAt
                        ? format(new Date(row.lastActivityAt), "MMM d")
                        : "—"}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>

          <ul className="grid gap-2 p-3 md:hidden">
            {rows.map((row) => (
              <li key={row.employeeId}>
                <button
                  type="button"
                  onClick={() => onSelectEmployee(row.employeeId)}
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 px-3 py-3 text-start"
                >
                  <div>
                    <p className="text-[13px] font-semibold">{row.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {row.ads} {t("organicAds.performance.ads")} ·{" "}
                      {row.healthScore}/100
                    </p>
                  </div>
                  <span className="font-mono text-sm tabular-nums">
                    {row.weeklyCount}/{row.weeklyTarget}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
