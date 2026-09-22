import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CrmHubTab } from "@/components/crm/crm-hub-sidebar";
import { useCrmHubLoaders } from "@/hooks/use-crm-hub-loaders";
import { useLiveReload } from "@/hooks/use-live-reload";
import { canCrm } from "@/lib/crm-policies";
import { sameLeadFilters } from "@/lib/crm/lead-filters";
import { resolveDataAccessScope } from "@/constants/permissions";
import {
  ensureCrmDashboard,
  ensureCrmList,
  ensurePaginatedLeads,
  ensureSalesPerformance,
} from "@/lib/crm-normalize";
import { CRM_OPEN_LEAD_EVENT, CRM_UPDATED_EVENT } from "@/lib/events";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
  CrmBusinessType,
  CrmDashboard,
  CrmDashboardFilters,
  CrmFeedbackType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmLeadFilters,
  CrmSalesPerformanceRow,
  CrmStage,
  PaginatedLeads,
} from "@/types/crm";

export function useCrmHub() {
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) =>
    s.authenticated ? s.permissions : undefined
  );

  const canCreate = canCrm(role, "create", permissions);
  const canAssign = canCrm(role, "assign", permissions);
  const crmScope = resolveDataAccessScope(
    permissions,
    "crm.viewOthersLeads",
    "crm.viewTeamLeads",
    role
  );
  const canViewOthers = crmScope === "all";
  const canViewTeam = crmScope !== "own";
  const canManageStages = canCrm(role, "manage_stages", permissions);
  const canManageBusinessTypes = canCrm(role, "manage_business_types", permissions);
  const canViewPerformance = canCrm(role, "view_performance", permissions);
  const canViewReports = canCrm(role, "view_reports", permissions);
  const canViewDashboard = canCrm(role, "view_dashboard", permissions);

  const [tab, setTab] = useState<CrmHubTab>(
    canViewDashboard ? "dashboard" : "leads"
  );
  const [leadsView, setLeadsView] = useState<"cards" | "table">("cards");
  const [coldCallsView, setColdCallsView] = useState<"cards" | "table">(
    "cards"
  );
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [delayCount, setDelayCount] = useState(0);
  /** After the first successful paint, refreshes stay soft (no table skeletons). */
  const readyRef = useRef(false);

  const [stages, setStages] = useState<CrmStage[]>([]);
  const [feedbackTypes, setFeedbackTypes] = useState<CrmFeedbackType[]>([]);
  const [businessTypes, setBusinessTypes] = useState<CrmBusinessType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  const [leadsPage, setLeadsPage] = useState<PaginatedLeads | null>(null);
  const [pipelineLeads, setPipelineLeads] = useState<CrmLead[]>([]);
  const [leadStageCounts, setLeadStageCounts] = useState<{
    total: number;
    byStage: Record<string, number>;
  } | null>(null);
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);
  const [feedback, setFeedback] = useState<CrmLeadFeedback[]>([]);
  const [performance, setPerformance] = useState<CrmSalesPerformanceRow[]>([]);
  const [activityLeads, setActivityLeads] = useState<CrmLead[]>([]);

  const [dashFilters, setDashFilters] = useState<CrmDashboardFilters>({
    range: "this_month",
  });
  const [leadFilters, setLeadFilters] = useState<CrmLeadFilters>({
    page: 1,
    pageSize: 20,
    sort: "createdAt",
    order: "desc",
    recordType: "lead",
  });
  /** Owner filter for leads / cold-call stage cards — local only so counts update without reload. */
  const [overviewOwnerEmployeeId, setOverviewOwnerEmployeeId] = useState<
    string | undefined
  >();
  const [createRecordType, setCreateRecordType] = useState<"lead" | "cold_call">(
    "lead"
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [viewLeadId, setViewLeadId] = useState<string | null>(null);
  const [viewLeadTab, setViewLeadTab] = useState("overview");
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(
    null
  );

  const openViewLead = useCallback((id: string, tab = "overview") => {
    setViewLeadTab(tab);
    setViewLeadId(id);
  }, []);

  const closeViewLead = useCallback(() => {
    setViewLeadId(null);
    setViewLeadTab("overview");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lead = new URLSearchParams(window.location.search).get("lead");
    if (lead) openViewLead(lead);

    function onOpenLead(event: Event) {
      const id = (event as CustomEvent<string>).detail?.trim();
      if (id) openViewLead(id);
    }
    window.addEventListener(CRM_OPEN_LEAD_EVENT, onOpenLead);
    return () => window.removeEventListener(CRM_OPEN_LEAD_EVENT, onOpenLead);
  }, [openViewLead]);

  const {
    loadCore,
    loadDashboard,
    loadLeads,
    loadLeadCounts,
    loadDelayCount,
    loadPipeline,
    loadActivities,
    loadFeedback,
    loadPerformance,
  } = useCrmHubLoaders({
    canViewDashboard,
    canViewPerformance,
    dashFilters,
    leadFilters,
    overviewOwnerEmployeeId,
    setStages,
    setFeedbackTypes,
    setBusinessTypes,
    setEmployees,
    setDashboard,
    setLeadsPage,
    setPipelineLeads,
    setLeadStageCounts,
    setDelayCount,
    setActivities,
    setActivityLeads,
    setFeedback,
    setPerformance,
  });

  const reloadVisible = useCallback(async (opts?: { silent?: boolean }) => {
    // Soft = live poll / CRM event / any refresh after the first load.
    // Hard loading skeletons only on the initial hub mount.
    const soft = Boolean(opts?.silent) || readyRef.current;
    if (soft) setSyncing(true);
    else setLoading(true);
    try {
      await loadCore();
      const jobs: Promise<void>[] = [loadDelayCount()];
      if (tab === "dashboard" || tab === "reports" || tab === "performance") {
        jobs.push(loadDashboard());
      }
      if (tab === "leads") {
        if (leadsView === "table") jobs.push(loadLeads());
        jobs.push(loadPipeline());
        jobs.push(loadLeadCounts());
      }
      if (tab === "coldCalls") {
        if (coldCallsView === "table") jobs.push(loadLeads());
        jobs.push(loadLeadCounts());
      }
      if (tab === "delay") jobs.push(loadLeads());
      if (tab === "pipeline") jobs.push(loadPipeline());
      if (tab === "activities") jobs.push(loadActivities());
      if (tab === "feedback") {
        jobs.push(loadFeedback());
        jobs.push(loadDashboard());
      }
      if (tab === "performance") jobs.push(loadPerformance());
      await Promise.all(jobs);
      setLastUpdatedAt(Date.now());
    } finally {
      readyRef.current = true;
      setLoading(false);
      setSyncing(false);
      setReady(true);
    }
  }, [
    tab,
    leadsView,
    coldCallsView,
    loadCore,
    loadDashboard,
    loadLeads,
    loadLeadCounts,
    loadDelayCount,
    loadPipeline,
    loadActivities,
    loadFeedback,
    loadPerformance,
  ]);

  const setLeadFiltersStable = useCallback(
    (next: Parameters<typeof setLeadFilters>[0]) => {
      setLeadFilters((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        return sameLeadFilters(prev, resolved) ? prev : resolved;
      });
    },
    []
  );

  /** Delay tab always stays locked to overdue + active without creating churn. */
  const setDelayLeadFilters = useCallback(
    (next: Parameters<typeof setLeadFilters>[0]) => {
      setLeadFilters((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const merged: CrmLeadFilters = {
          ...resolved,
          followUp: "overdue",
          status: "active",
          recordType: "lead",
        };
        return sameLeadFilters(prev, merged) ? prev : merged;
      });
    },
    []
  );

  const pollIntervalMs = useMemo(() => {
    if (
      tab === "leads" ||
      tab === "coldCalls" ||
      tab === "delay" ||
      tab === "pipeline" ||
      tab === "activities" ||
      tab === "feedback"
    ) {
      return 12_000;
    }
    if (tab === "dashboard" || tab === "performance") return 20_000;
    return 40_000;
  }, [tab]);

  useLiveReload(
    () => {
      void reloadVisible({ silent: true });
    },
    [CRM_UPDATED_EVENT],
    { intervalMs: pollIntervalMs, skipInitial: true }
  );

  useEffect(() => {
    void reloadVisible();
  }, [reloadVisible]);

  // Drop stale lead pages when switching into Delay / Leads / Cold Calls table so we never
  // briefly show another tab's rows (soft reload keeps loading=false).
  const leadsSurfaceRef = useRef(`${tab}:${leadsView}:${coldCallsView}`);
  const recordTypeRef = useRef(leadFilters.recordType ?? "lead");
  useEffect(() => {
    const next = `${tab}:${leadsView}:${coldCallsView}`;
    if (leadsSurfaceRef.current === next) return;
    leadsSurfaceRef.current = next;
    if (
      tab === "delay" ||
      (tab === "leads" && leadsView === "table") ||
      (tab === "coldCalls" && coldCallsView === "table")
    ) {
      setLeadsPage(null);
    }
  }, [tab, leadsView, coldCallsView]);

  useEffect(() => {
    const nextType = leadFilters.recordType ?? "lead";
    if (recordTypeRef.current === nextType) return;
    recordTypeRef.current = nextType;
    setLeadStageCounts(null);
    setLeadsPage(null);
  }, [leadFilters.recordType]);

  /** Render-time normalization — never pass raw API envelopes into panels. */
  const safeStages = useMemo(() => ensureCrmList<CrmStage>(stages), [stages]);
  const safeFeedbackTypes = useMemo(
    () => ensureCrmList<CrmFeedbackType>(feedbackTypes),
    [feedbackTypes]
  );
  const safeBusinessTypes = useMemo(
    () => ensureCrmList<CrmBusinessType>(businessTypes),
    [businessTypes]
  );
  const safeEmployees = useMemo(
    () => (Array.isArray(employees) ? employees : []),
    [employees]
  );
  const safeDashboard = useMemo(
    () => (dashboard ? ensureCrmDashboard(dashboard) : null),
    [dashboard]
  );
  const safeLeadsPage = useMemo(
    () => (leadsPage == null ? null : ensurePaginatedLeads(leadsPage)),
    [leadsPage]
  );
  const safePipelineLeads = useMemo(
    () => ensureCrmList<CrmLead>(pipelineLeads),
    [pipelineLeads]
  );
  const safeActivities = useMemo(
    () => ensureCrmList<CrmLeadActivity>(activities),
    [activities]
  );
  const safeFeedback = useMemo(
    () => ensureCrmList<CrmLeadFeedback>(feedback),
    [feedback]
  );
  const safePerformance = useMemo(
    () =>
      ensureSalesPerformance(
        performance.length
          ? performance
          : (safeDashboard?.salesPerformance ?? [])
      ),
    [performance, safeDashboard]
  );
  const safeActivityLeads = useMemo(
    () => ensureCrmList<CrmLead>(activityLeads),
    [activityLeads]
  );

  const feedbackLeadPool = useMemo(() => {
    const map = new Map<string, CrmLead>();
    for (const l of safeActivityLeads) map.set(l.id, l);
    for (const l of safePipelineLeads) map.set(l.id, l);
    for (const l of safeLeadsPage?.items ?? []) map.set(l.id, l);
    return [...map.values()];
  }, [safeActivityLeads, safePipelineLeads, safeLeadsPage]);

  function openCreate(recordType: "lead" | "cold_call" = "lead") {
    setCreateRecordType(recordType);
    setEditingLead(null);
    setFormOpen(true);
  }

  function openEdit(lead: CrmLead) {
    setCreateRecordType(lead.recordType ?? "lead");
    setEditingLead(lead);
    setFormOpen(true);
  }

  function navigateLeads(filters?: Partial<CrmLeadFilters>) {
    if (filters?.followUp === "overdue") {
      navigateDelay();
      return;
    }
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: prev.sort ?? "updatedAt",
      order: prev.order ?? "desc",
      ...filters,
      recordType: filters?.recordType ?? "lead",
    }));
    setLeadsView("table");
    setTab("leads");
  }

  function navigateDelay() {
    setLeadFilters((prev) => {
      const next: CrmLeadFilters = {
        page: 1,
        pageSize: prev.pageSize ?? 20,
        sort: "nextFollowUpAt",
        order: "asc",
        followUp: "overdue",
        status: "active",
        recordType: "lead",
        ownerEmployeeId: prev.ownerEmployeeId,
        search: prev.search,
      };
      return sameLeadFilters(prev, next) ? prev : next;
    });
    setTab("delay");
  }

  function setOverviewOwner(ownerEmployeeId: string | undefined) {
    setOverviewOwnerEmployeeId(ownerEmployeeId || undefined);
  }

  function openAllLeads() {
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: prev.sort ?? "updatedAt",
      order: prev.order ?? "desc",
      ownerEmployeeId: overviewOwnerEmployeeId,
      recordType: "lead",
    }));
    setLeadsView("table");
  }

  function openStageLeads(stageId: string) {
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: prev.sort ?? "updatedAt",
      order: prev.order ?? "desc",
      ownerEmployeeId: overviewOwnerEmployeeId,
      stageId,
      recordType: "lead",
    }));
    setLeadsView("table");
  }

  function backToLeadsCards() {
    setLeadsView("cards");
    setOverviewOwnerEmployeeId(leadFilters.ownerEmployeeId);
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: prev.sort ?? "updatedAt",
      order: prev.order ?? "desc",
      ownerEmployeeId: prev.ownerEmployeeId,
      recordType: "lead",
    }));
  }

  function openAllColdCalls() {
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: prev.sort ?? "updatedAt",
      order: prev.order ?? "desc",
      ownerEmployeeId: overviewOwnerEmployeeId,
      recordType: "cold_call",
    }));
    setColdCallsView("table");
  }

  function openStageColdCalls(stageId: string) {
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: prev.sort ?? "updatedAt",
      order: prev.order ?? "desc",
      ownerEmployeeId: overviewOwnerEmployeeId,
      stageId,
      recordType: "cold_call",
    }));
    setColdCallsView("table");
  }

  function backToColdCallCards() {
    setColdCallsView("cards");
    setOverviewOwnerEmployeeId(leadFilters.ownerEmployeeId);
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: prev.sort ?? "updatedAt",
      order: prev.order ?? "desc",
      ownerEmployeeId: prev.ownerEmployeeId,
      recordType: "cold_call",
    }));
  }

  function onTabChange(next: CrmHubTab) {
    if (next === "stages" && !canManageStages) return;
    if (next === "businessTypes" && !canManageBusinessTypes) return;
    if (next === "reports" && !canViewReports) return;
    if (next === "performance" && !canViewPerformance) return;
    if (next === "leads") {
      setLeadsView("cards");
      setLeadFilters((prev) => ({
        page: 1,
        pageSize: prev.pageSize ?? 20,
        sort: prev.sort ?? "updatedAt",
        order: prev.order ?? "desc",
        recordType: "lead",
        ownerEmployeeId: prev.recordType === "lead" ? prev.ownerEmployeeId : undefined,
      }));
    }
    if (next === "coldCalls") {
      setColdCallsView("cards");
      setLeadFilters((prev) => ({
        page: 1,
        pageSize: prev.pageSize ?? 20,
        sort: prev.sort ?? "updatedAt",
        order: prev.order ?? "desc",
        recordType: "cold_call",
        ownerEmployeeId:
          prev.recordType === "cold_call" ? prev.ownerEmployeeId : undefined,
      }));
    }
    if (next === "delay") {
      setLeadFilters((prev) => {
        const merged: CrmLeadFilters = {
          page: 1,
          pageSize: prev.pageSize ?? 20,
          sort: "nextFollowUpAt",
          order: "asc",
          followUp: "overdue",
          status: "active",
          recordType: "lead",
          ownerEmployeeId: prev.ownerEmployeeId,
          search: prev.search,
        };
        return sameLeadFilters(prev, merged) ? prev : merged;
      });
    }
    setTab(next);
  }

  const overviewLeads = useMemo(() => {
    if ((leadFilters.recordType ?? "lead") === "cold_call") return [];
    const ownerId = overviewOwnerEmployeeId?.trim();
    if (!ownerId) return safePipelineLeads;
    return safePipelineLeads.filter((lead) => lead.ownerEmployeeId === ownerId);
  }, [safePipelineLeads, overviewOwnerEmployeeId, leadFilters.recordType]);

  const stageCounts = useMemo(() => {
    if (leadStageCounts) {
      return Object.entries(leadStageCounts.byStage).map(([stageId, count]) => ({
        stageId,
        count,
      }));
    }
    const map = new Map<string, number>();
    for (const lead of overviewLeads) {
      map.set(lead.stageId, (map.get(lead.stageId) ?? 0) + 1);
    }
    return [...map.entries()].map(([stageId, count]) => ({ stageId, count }));
  }, [leadStageCounts, overviewLeads]);

  const overviewTotal = useMemo(() => {
    if (leadStageCounts) return leadStageCounts.total;
    return overviewLeads.length;
  }, [leadStageCounts, overviewLeads]);

  return {
    canCreate,
    canAssign,
    canViewOthers,
    canViewTeam,
    canManageStages,
    canManageBusinessTypes,
    canViewPerformance,
    canViewReports,
    canViewDashboard,
    tab,
    setTab,
    leadsView,
    coldCallsView,
    ready,
    loading,
    syncing,
    lastUpdatedAt,
    delayCount,
    dashFilters,
    setDashFilters,
    leadFilters,
    setLeadFilters: setLeadFiltersStable,
    setDelayLeadFilters,
    overviewOwnerEmployeeId,
    formOpen,
    setFormOpen,
    editingLead,
    createRecordType,
    viewLeadId,
    viewLeadTab,
    setViewLeadId,
    openViewLead,
    closeViewLead,
    profileEmployeeId,
    setProfileEmployeeId,
    reloadVisible,
    safeStages,
    safeFeedbackTypes,
    safeBusinessTypes,
    safeEmployees,
    safeDashboard,
    safeLeadsPage,
    safePipelineLeads,
    safeActivities,
    safeFeedback,
    safePerformance,
    safeActivityLeads,
    feedbackLeadPool,
    stageCounts,
    overviewTotal,
    openCreate,
    openEdit,
    navigateLeads,
    navigateDelay,
    openAllLeads,
    openStageLeads,
    setOverviewOwner,
    backToLeadsCards,
    openAllColdCalls,
    openStageColdCalls,
    backToColdCallCards,
    onTabChange,
  };
}
