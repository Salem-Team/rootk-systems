"use client";

import { Suspense } from "react";
import { Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddAdvertisementSheet } from "@/components/organic-ads/add-advertisement-sheet";
import { TargetAssignSheet } from "@/components/targets/target-assign-sheet";
import { AdvertisementDetailsSheet } from "@/components/organic-ads/advertisement-details-sheet";
import { AdvertisementList } from "@/components/organic-ads/advertisement-list";
import { OrganicAdsHubSidebar } from "@/components/organic-ads/organic-ads-hub-sidebar";
import { OrganicAdsOverviewTab } from "@/components/organic-ads/organic-ads-overview-tab";
import { SalesPerformancePanel } from "@/components/organic-ads/sales-performance-panel";
import { ValidationPanel } from "@/components/organic-ads/validation-panel";
import { useOrganicAdsPage } from "@/components/organic-ads/use-organic-ads-page";
import { getOrganicAds } from "@/services/organic-ads.service";
import type { DateRangePreset } from "@/types/organic-ads";

function OrganicAdsPageContent() {
  const page = useOrganicAdsPage();
  const { t } = page;

  if (!page.ready || !page.overview) {
    return <PageSkeleton />;
  }

  const overview = page.overview;

  return (
    <PageTransition>
      <PageHeader
        eyebrow={t("organicAds.page.eyebrow")}
        title={t("organicAds.page.title")}
        description={t("organicAds.page.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={page.range}
              onValueChange={(v) => page.setRange(v as DateRangePreset)}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "this_week",
                    "last_7_days",
                    "this_month",
                    "all",
                  ] as DateRangePreset[]
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`organicAds.range.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {page.canViewTeam ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => page.setAssignOpen(true)}
              >
                <Target className="me-1.5 h-4 w-4" aria-hidden />
                {t("organicAds.actions.assignQuota")}
              </Button>
            ) : null}
            {page.canCreate ? (
              <Button type="button" onClick={() => page.setAddOpen(true)}>
                <Plus className="me-1.5 h-4 w-4" aria-hidden />
                {t("organicAds.actions.add")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <OrganicAdsHubSidebar
          tab={page.tab}
          onTabChange={(next) => {
            page.setProfile(null);
            page.syncTabToUrl(next, { employeeId: undefined, filter: undefined });
          }}
          canViewPerformance={page.canViewPerformance}
        />

        <div className="min-w-0 space-y-4">
          {page.tab === "overview" ? (
            <OrganicAdsOverviewTab
              overview={overview}
              activitySort={page.activitySort}
              onActivitySortChange={page.setActivitySort}
              canViewPerformance={page.canViewPerformance}
              canViewTeam={page.canViewTeam}
              canManageSettings={page.canManageSettings}
              onSelectEmployee={(id) => void page.openProfile(id)}
              onAttention={page.handleAttention}
              onFiltersChange={page.setFilters}
              onSyncTab={page.syncTabToUrl}
              onReload={page.load}
            />
          ) : null}

          {page.tab === "advertisements" ? (
            <AdvertisementList
              ads={page.ads}
              employees={page.employees}
              filters={page.filters}
              onFiltersChange={page.setFilters}
              onView={page.setViewing}
              onEditStatus={page.handleStatus}
              onDelete={page.handleDelete}
              onAdd={() => page.setAddOpen(true)}
              canManageTeam={page.canViewTeam}
            />
          ) : null}

          {page.tab === "performance" && page.canViewPerformance ? (
            <SalesPerformancePanel
              rows={page.performance}
              profile={page.profile}
              onSelectEmployee={(id) => void page.openProfile(id)}
              onClearProfile={() => {
                page.setProfile(null);
                page.syncTabToUrl("performance", { employeeId: undefined });
              }}
              onViewAd={(adId) => {
                const ad = page.ads.find((a) => a.id === adId);
                if (ad) page.setViewing(ad);
                else {
                  void getOrganicAds({ search: adId }).then((res) => {
                    if (res.success && res.data.items[0]) {
                      page.setViewing(res.data.items[0]);
                    }
                  });
                }
              }}
            />
          ) : null}

          {page.tab === "validation" ? (
            <ValidationPanel
              ads={page.ads}
              employeeNames={page.employeeMap}
              onView={page.setViewing}
            />
          ) : null}
        </div>
      </div>

      <AddAdvertisementSheet
        open={page.addOpen}
        onOpenChange={page.setAddOpen}
        onCreated={() => void page.load()}
        employeeNames={page.employeeMap}
        onViewExisting={(id) => {
          const ad = page.ads.find((a) => a.id === id);
          if (ad) page.setViewing(ad);
        }}
      />

      {page.canViewTeam ? (
        <TargetAssignSheet
          open={page.assignOpen}
          onOpenChange={page.setAssignOpen}
          categories={page.categories}
          types={page.types}
          employees={page.employees}
          defaultCategoryId={page.organicAdsCategoryId}
          defaultTypeId={page.organicAdsTypeId}
          defaultQuantity={5}
          onSaved={() => {
            page.setAssignOpen(false);
            void page.load();
          }}
        />
      ) : null}

      <AdvertisementDetailsSheet
        ad={page.viewing}
        ownerName={
          page.viewing ? page.employeeMap.get(page.viewing.ownerEmployeeId) : undefined
        }
        open={!!page.viewing}
        onOpenChange={(open) => {
          if (!open) page.setViewing(null);
        }}
      />

      {page.canCreate ? (
        <div className="fixed inset-x-0 bottom-[4.75rem] z-30 px-3 lg:hidden">
          <Button
            type="button"
            className="h-12 w-full shadow-[var(--shadow-float)]"
            onClick={() => page.setAddOpen(true)}
          >
            <Plus className="me-1.5 h-4 w-4" aria-hidden />
            {t("organicAds.actions.add")}
          </Button>
        </div>
      ) : null}
    </PageTransition>
  );
}

export default function OrganicAdsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrganicAdsPageContent />
    </Suspense>
  );
}
