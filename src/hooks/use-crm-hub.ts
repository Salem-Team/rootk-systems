import { useCallback, useEffect, useMemo, useState } from "react";
import type { CrmHubTab } from "@/components/crm/crm-hub-sidebar";
import { useCrmHubLoaders } from "@/hooks/use-crm-hub-loaders";
import { useLiveReload } from "@/hooks/use-live-reload";
import { canCrm } from "@/lib/crm-policies";
import {
  ensureCrmDashboard,
  ensureCrmList,
  ensurePaginatedLeads,
  ensureSalesPerformance,
} from "@/lib/crm-normalize";
import { CRM_UPDATED_EVENT } from "@/lib/events";
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
  const canManageStages = canCrm(role, "manage_stages", permissions);
  const canManageBusinessTypes = canCrm(role, "manage_business_types", permissions);
  const canViewPerformance = canCrm(role, "view_performance", permissions);
  const canViewReports = canCrm(role, "view_reports", permissions);
  const canViewDashboard = canCrm(role, "view_dashboard", permissions);

  const [tab, setTab] = useState<CrmHubTab>(
    canViewDashboard ? "dashboard" : "leads"
  );
  const [leadsView, setLeadsView] = useState<"cards" | "table">("cards");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stages, setStages] = useState<CrmStage[]>([]);
  const [feedbackTypes, setFeedbackTypes] = useState<CrmFeedbackType[]>([]);
  const [businessTypes, setBusinessTypes] = useState<CrmBusinessType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  const [leadsPage, setLeadsPage] = useState<PaginatedLeads | null>(null);
  const [pipelineLeads, setPipelineLeads] = useState<CrmLead[]>([]);
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
    sort: "updatedAt",
    order: "desc",
  });
  /** Owner filter for leads stage cards — local only so counts update without reload. */
  const [overviewOwnerEmployeeId, setOverviewOwnerEmployeeId] = useState<
    string | undefined
  >();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [viewLeadId, setViewLeadId] = useState<string | null>(null);
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(
    null
  );

  const {
    loadCore,
    loadDashboard,
    loadLeads,
    loadPipeline,
    loadActivities,
    loadFeedback,
    loadPerformance,
  } = useCrmHubLoaders({
    canViewDashboard,
    canViewPerformance,
    dashFilters,
    leadFilters,
    setStages,
    setFeedbackTypes,
    setBusinessTypes,
    setEmployees,
    setDashboard,
    setLeadsPage,
    setPipelineLeads,
    setActivities,
    setActivityLeads,
    setFeedback,
    setPerformance,
  });

  const reloadVisible = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    await loadCore();
    const jobs: Promise<void>[] = [];
    if (tab === "dashboard" || tab === "reports" || tab === "performance") {
      jobs.push(loadDashboard());
    }
    if (tab === "leads") {
      if (leadsView === "table") jobs.push(loadLeads());
      jobs.push(loadPipeline());
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
    setLoading(false);
    setReady(true);
  }, [
    tab,
    leadsView,
    loadCore,
    loadDashboard,
    loadLeads,
    loadPipeline,
    loadActivities,
    loadFeedback,
    loadPerformance,
  ]);

  useLiveReload(
    () => {
      void reloadVisible({ silent: true });
    },
    [CRM_UPDATED_EVENT],
    { intervalMs: 40_000 }
  );

  useEffect(() => {
    void reloadVisible();
  }, [reloadVisible]);

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
    () => ensurePaginatedLeads(leadsPage),
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
    for (const l of safeLeadsPage.items) map.set(l.id, l);
    return [...map.values()];
  }, [safeActivityLeads, safePipelineLeads, safeLeadsPage]);

  function openCreate() {
    setEditingLead(null);
    setFormOpen(true);
  }

  function openEdit(lead: CrmLead) {
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
    }));
    setLeadsView("table");
    setTab("leads");
  }

  function navigateDelay() {
    setLeadFilters((prev) => ({
      page: 1,
      pageSize: prev.pageSize ?? 20,
      sort: "nextFollowUpAt",
      order: "asc",
      followUp: "overdue",
      status: "active",
    }));
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
    }));
  }

  function onTabChange(next: CrmHubTab) {
    if (next === "stages" && !canManageStages) return;
    if (next === "businessTypes" && !canManageBusinessTypes) return;
    if (next === "reports" && !canViewReports) return;
    if (next === "performance" && !canViewPerformance) return;
    if (next === "leads") setLeadsView("cards");
    if (next === "delay") {
      setLeadFilters((prev) => ({
        page: 1,
        pageSize: prev.pageSize ?? 20,
        sort: "nextFollowUpAt",
        order: "asc",
        followUp: "overdue",
        status: "active",
        ownerEmployeeId: prev.ownerEmployeeId,
        search: prev.search,
      }));
    }
    setTab(next);
  }

  const overviewLeads = useMemo(() => {
    const ownerId = overviewOwnerEmployeeId?.trim();
    if (!ownerId) return safePipelineLeads;
    return safePipelineLeads.filter((lead) => lead.ownerEmployeeId === ownerId);
  }, [safePipelineLeads, overviewOwnerEmployeeId]);

  const stageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const lead of overviewLeads) {
      map.set(lead.stageId, (map.get(lead.stageId) ?? 0) + 1);
    }
    return [...map.entries()].map(([stageId, count]) => ({ stageId, count }));
  }, [overviewLeads]);

  const overviewTotal = useMemo(() => overviewLeads.length, [overviewLeads]);

  return {
    canCreate,
    canAssign,
    canManageStages,
    canManageBusinessTypes,
    canViewPerformance,
    canViewReports,
    canViewDashboard,
    tab,
    setTab,
    leadsView,
    ready,
    loading,
    dashFilters,
    setDashFilters,
    leadFilters,
    setLeadFilters,
    overviewOwnerEmployeeId,
    formOpen,
    setFormOpen,
    editingLead,
    viewLeadId,
    setViewLeadId,
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
    onTabChange,
  };
}
