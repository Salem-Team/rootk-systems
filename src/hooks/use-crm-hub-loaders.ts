import { useCallback } from "react";
import {
  ensureCrmDashboard,
  ensureCrmList,
  ensurePaginatedLeads,
  ensureSalesPerformance,
} from "@/lib/crm-normalize";
import { getWorkforceEmployees } from "@/services/employees.service";
import {
  getCrmActivities,
  getCrmBusinessTypes,
  getCrmDashboard,
  getCrmFeedbackList,
  getCrmFeedbackTypes,
  getCrmLeads,
  getCrmPerformance,
  getCrmStages,
} from "@/services/crm.service";
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

interface UseCrmHubLoadersArgs {
  canViewDashboard: boolean;
  canViewPerformance: boolean;
  dashFilters: CrmDashboardFilters;
  leadFilters: CrmLeadFilters;
  setStages: (v: CrmStage[]) => void;
  setFeedbackTypes: (v: CrmFeedbackType[]) => void;
  setBusinessTypes: (v: CrmBusinessType[]) => void;
  setEmployees: (v: Employee[]) => void;
  setDashboard: (v: CrmDashboard | null) => void;
  setLeadsPage: (v: PaginatedLeads | null) => void;
  setPipelineLeads: (v: CrmLead[]) => void;
  setActivities: (v: CrmLeadActivity[]) => void;
  setActivityLeads: (v: CrmLead[]) => void;
  setFeedback: (v: CrmLeadFeedback[]) => void;
  setPerformance: (v: CrmSalesPerformanceRow[]) => void;
}

/** Per-tab data loaders for the CRM hub page, kept separate to bound hook size. */
export function useCrmHubLoaders({
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
}: UseCrmHubLoadersArgs) {
  const loadCore = useCallback(async () => {
    const [stageRes, typeRes, btRes, empRes] = await Promise.all([
      getCrmStages(),
      getCrmFeedbackTypes(),
      getCrmBusinessTypes(),
      getWorkforceEmployees(),
    ]);
    if (stageRes.success) setStages(ensureCrmList(stageRes.data));
    if (typeRes.success) setFeedbackTypes(ensureCrmList(typeRes.data));
    if (btRes.success) setBusinessTypes(ensureCrmList(btRes.data));
    if (empRes.success) {
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    }
  }, [setStages, setFeedbackTypes, setBusinessTypes, setEmployees]);

  const loadDashboard = useCallback(async () => {
    if (!canViewDashboard) return;
    const res = await getCrmDashboard(dashFilters);
    if (res.success) setDashboard(ensureCrmDashboard(res.data));
    else setDashboard(ensureCrmDashboard(null));
  }, [canViewDashboard, dashFilters, setDashboard]);

  const loadLeads = useCallback(async () => {
    const res = await getCrmLeads(leadFilters);
    if (res.success) setLeadsPage(ensurePaginatedLeads(res.data));
    else setLeadsPage(ensurePaginatedLeads(null));
  }, [leadFilters, setLeadsPage]);

  const loadPipeline = useCallback(async () => {
    const res = await getCrmLeads({
      page: 1,
      pageSize: 500,
      status: "active",
      sort: "updatedAt",
      order: "desc",
    });
    if (res.success) {
      setPipelineLeads(ensurePaginatedLeads(res.data).items);
    } else {
      setPipelineLeads([]);
    }
  }, [setPipelineLeads]);

  const loadActivities = useCallback(async () => {
    const [actRes, leadsRes] = await Promise.all([
      getCrmActivities(50),
      getCrmLeads({ page: 1, pageSize: 100 }),
    ]);
    if (actRes.success) setActivities(ensureCrmList(actRes.data));
    else setActivities([]);
    if (leadsRes.success) {
      setActivityLeads(ensurePaginatedLeads(leadsRes.data).items);
    } else {
      setActivityLeads([]);
    }
  }, [setActivities, setActivityLeads]);

  const loadFeedback = useCallback(async () => {
    const [fbRes, leadsRes] = await Promise.all([
      getCrmFeedbackList(),
      getCrmLeads({ page: 1, pageSize: 100 }),
    ]);
    if (fbRes.success) setFeedback(ensureCrmList(fbRes.data));
    else setFeedback([]);
    if (leadsRes.success) {
      setActivityLeads(ensurePaginatedLeads(leadsRes.data).items);
    }
  }, [setFeedback, setActivityLeads]);

  const loadPerformance = useCallback(async () => {
    if (!canViewPerformance) return;
    const res = await getCrmPerformance();
    if (res.success) setPerformance(ensureSalesPerformance(res.data));
    else setPerformance([]);
  }, [canViewPerformance, setPerformance]);

  return {
    loadCore,
    loadDashboard,
    loadLeads,
    loadPipeline,
    loadActivities,
    loadFeedback,
    loadPerformance,
  };
}
