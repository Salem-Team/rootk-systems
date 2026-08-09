import { toast } from "sonner";
import { AdsActivityFeed } from "@/components/organic-ads/ads-activity-feed";
import { AdsCompliance } from "@/components/organic-ads/ads-compliance";
import { NeedsAttention } from "@/components/organic-ads/needs-attention";
import { OrganicAdsKpisStrip } from "@/components/organic-ads/organic-ads-kpis";
import { PlatformBreakdown } from "@/components/organic-ads/platform-breakdown";
import { TeamActivity } from "@/components/organic-ads/team-activity";
import { WeeklyActivity } from "@/components/organic-ads/weekly-activity";
import { LinkedTargetsPanel } from "@/components/organic-ads/linked-targets-panel";
import { updateOrganicAdsSettings } from "@/services/organic-ads.service";
import { useTranslation } from "@/hooks/use-translation";
import type {
  NeedsAttentionItem,
  OrganicAdsFilters,
  OrganicAdsOverview,
  TeamActivitySort,
} from "@/types/organic-ads";
import type { OrganicAdsHubTab } from "@/components/organic-ads/organic-ads-hub-sidebar";

export function OrganicAdsOverviewTab({
  overview,
  activitySort,
  onActivitySortChange,
  canViewPerformance,
  canViewTeam,
  canManageSettings,
  onSelectEmployee,
  onAttention,
  onFiltersChange,
  onSyncTab,
  onReload,
}: {
  overview: OrganicAdsOverview;
  activitySort: TeamActivitySort;
  onActivitySortChange: (sort: TeamActivitySort) => void;
  canViewPerformance: boolean;
  canViewTeam: boolean;
  canManageSettings: boolean;
  onSelectEmployee: (id: string) => void;
  onAttention: (item: NeedsAttentionItem) => void;
  onFiltersChange: (updater: (f: OrganicAdsFilters) => OrganicAdsFilters) => void;
  onSyncTab: (tab: OrganicAdsHubTab) => void;
  onReload: () => void | Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <>
      <OrganicAdsKpisStrip stats={overview.kpis} />
      <div className="grid gap-4 xl:grid-cols-2">
        <TeamActivity
          rows={overview.teamActivity}
          sort={activitySort}
          onSortChange={onActivitySortChange}
          onSelectEmployee={
            canViewPerformance ? onSelectEmployee : undefined
          }
        />
        <NeedsAttention items={overview.needsAttention} onSelect={onAttention} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <WeeklyActivity points={overview.weeklyActivity} />
        <PlatformBreakdown
          rows={overview.platforms}
          onSelect={(platform) => {
            onFiltersChange((f) => ({ ...f, platform, page: 1 }));
            onSyncTab("advertisements");
          }}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AdsActivityFeed events={overview.recentActivity} />
        {canViewTeam ? (
          <AdsCompliance
            rows={overview.teamActivity}
            weeklyTarget={overview.settings.weeklyTarget}
            canManage={canManageSettings}
            onSaveTarget={async (weeklyTarget) => {
              const res = await updateOrganicAdsSettings({
                weeklyTarget,
                allowDuplicateOverride: overview.settings.allowDuplicateOverride,
              });
              if (res.success) {
                toast.success(t("organicAds.toast.settingsSaved"));
                await onReload();
              } else {
                toast.error(res.message);
              }
            }}
          />
        ) : null}
      </div>
      <LinkedTargetsPanel targets={overview.linkedTargets ?? []} />
    </>
  );
}
