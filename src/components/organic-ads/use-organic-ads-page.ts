"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getWorkforceEmployees } from "@/services/employees.service";
import { getTargetCategories, getTargetTypes } from "@/services/targets.service";
import {
  deleteOrganicAd,
  getOrganicAds,
  getOrganicAdsOverview,
  getSalesAdvertisingProfile,
  getSalesPerformance,
  updateOrganicAd,
} from "@/services/organic-ads.service";
import { useLiveReload } from "@/hooks/use-live-reload";
import { useTranslation } from "@/hooks/use-translation";
import { ORGANIC_ADS_UPDATED_EVENT, TARGETS_UPDATED_EVENT } from "@/lib/events";
import { isOrganicAdsType } from "@/lib/organic-ads-task-match";
import { canOrganicAds } from "@/lib/organic-ads-policies";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type { TargetCategory, TargetType } from "@/types/targets";
import type {
  AdStatus,
  DateRangePreset,
  NeedsAttentionItem,
  OrganicAdsFilters,
  OrganicAdsOverview,
  OrganicAdvertisement,
  SalesAdvertisingProfile,
  SalesPerformanceRow,
  TeamActivitySort,
} from "@/types/organic-ads";
import type { OrganicAdsHubTab } from "@/components/organic-ads/organic-ads-hub-sidebar";

function parseTab(value: string | null): OrganicAdsHubTab {
  if (
    value === "advertisements" ||
    value === "performance" ||
    value === "validation"
  ) {
    return value;
  }
  return "overview";
}

export function useOrganicAdsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useSessionStore((s) => s.role);

  const canCreate = canOrganicAds(role, "create");
  const canViewPerformance = canOrganicAds(role, "view_performance");
  const canManageSettings = canOrganicAds(role, "manage_settings");
  const canViewTeam = canOrganicAds(role, "view_team");

  const [tab, setTab] = useState<OrganicAdsHubTab>(() =>
    parseTab(searchParams.get("tab"))
  );
  const [range, setRange] = useState<DateRangePreset>("this_week");
  const [activitySort, setActivitySort] = useState<TeamActivitySort>("ads");
  const [overview, setOverview] = useState<OrganicAdsOverview | null>(null);
  const [ads, setAds] = useState<OrganicAdvertisement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [performance, setPerformance] = useState<SalesPerformanceRow[]>([]);
  const [profile, setProfile] = useState<SalesAdvertisingProfile | null>(null);
  const [filters, setFilters] = useState<OrganicAdsFilters>({
    page: 1,
    pageSize: 50,
  });
  const [ready, setReady] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewing, setViewing] = useState<OrganicAdvertisement | null>(null);
  const [categories, setCategories] = useState<TargetCategory[]>([]);
  const [types, setTypes] = useState<TargetType[]>([]);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees]
  );

  const syncTabToUrl = useCallback(
    (next: OrganicAdsHubTab, extra?: Record<string, string | undefined>) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          if (!value) params.delete(key);
          else params.set(key, value);
        }
      }
      router.replace(`/organic-ads?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const load = useCallback(async () => {
    const listFilters =
      tab === "validation"
        ? { page: 1, pageSize: 100 }
        : filters;
    const [overviewRes, adsRes, empRes, catRes, typeRes] = await Promise.all([
      getOrganicAdsOverview(range, activitySort),
      getOrganicAds(listFilters),
      getWorkforceEmployees(),
      getTargetCategories(),
      getTargetTypes(),
    ]);
    if (overviewRes.success) setOverview(overviewRes.data);
    if (adsRes.success) setAds(adsRes.data.items);
    if (empRes.success) setEmployees(empRes.data);
    if (catRes.success) setCategories(catRes.data);
    if (typeRes.success) setTypes(typeRes.data);

    if (canViewPerformance) {
      const perfRes = await getSalesPerformance();
      if (perfRes.success) setPerformance(perfRes.data);
    }
    setReady(true);
  }, [activitySort, canViewPerformance, filters, range, tab]);

  useLiveReload(load, [ORGANIC_ADS_UPDATED_EVENT, TARGETS_UPDATED_EVENT]);

  useEffect(() => {
    const urlTab = parseTab(searchParams.get("tab"));
    if (urlTab !== tab) setTab(urlTab);

    const employeeId = searchParams.get("employeeId");
    if (employeeId && canViewPerformance) {
      void getSalesAdvertisingProfile(employeeId).then((res) => {
        if (res.success) setProfile(res.data);
      });
    }

    const filter = searchParams.get("filter");
    if (filter === "duplicate") {
      setFilters((f) => ({ ...f, duplicateOnly: true }));
    }
    if (filter === "invalid") {
      setFilters((f) => ({
        ...f,
        validationStatus: "broken",
      }));
    }
    // Intentionally sync from URL on mount / param change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openProfile = useCallback(
    async (employeeId: string) => {
      syncTabToUrl("performance", { employeeId });
      const res = await getSalesAdvertisingProfile(employeeId);
      if (res.success) setProfile(res.data);
    },
    [syncTabToUrl]
  );

  const handleAttention = useCallback(
    (item: NeedsAttentionItem) => {
      if (item.advertisementId) {
        const ad = ads.find((a) => a.id === item.advertisementId);
        if (ad) {
          setViewing(ad);
          return;
        }
      }
      if (item.employeeId && canViewPerformance) {
        void openProfile(item.employeeId);
        return;
      }
      if (item.kind === "duplicate" || item.kind === "invalid_links") {
        syncTabToUrl("validation");
      }
    },
    [ads, canViewPerformance, openProfile, syncTabToUrl]
  );

  async function handleStatus(ad: OrganicAdvertisement, status: AdStatus) {
    const res = await updateOrganicAd(ad.id, { status });
    if (res.success) {
      toast.success(t("organicAds.toast.updated"));
      await load();
    } else {
      toast.error(res.message);
    }
  }

  async function handleDelete(ad: OrganicAdvertisement) {
    const confirmed = window.confirm(
      `${t("organicAds.confirmDelete.title")}\n${t("organicAds.confirmDelete.description")}`
    );
    if (!confirmed) return;
    const res = await deleteOrganicAd(ad.id);
    if (res.success) {
      toast.success(t("organicAds.toast.deleted"));
      await load();
    } else {
      toast.error(res.message);
    }
  }

  return {
    t,
    canCreate,
    canViewPerformance,
    canManageSettings,
    canViewTeam,
    tab,
    range,
    setRange,
    activitySort,
    setActivitySort,
    overview,
    ads,
    employees,
    performance,
    profile,
    setProfile,
    filters,
    setFilters,
    ready,
    addOpen,
    setAddOpen,
    assignOpen,
    setAssignOpen,
    categories,
    types,
    organicAdsTypeId: types.find((ty) => isOrganicAdsType(ty))?.id,
    organicAdsCategoryId: types.find((ty) => isOrganicAdsType(ty))?.categoryId,
    viewing,
    setViewing,
    employeeMap,
    syncTabToUrl,
    load,
    openProfile,
    handleAttention,
    handleStatus,
    handleDelete,
  };
}
