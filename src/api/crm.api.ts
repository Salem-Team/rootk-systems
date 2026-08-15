import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import {
  emptyCrmDashboard,
  emptyPaginatedLeads,
  ensureCrmDashboard,
  ensureCrmList,
  ensureLeadFeedbackList,
  ensureLeadTimeline,
  ensurePaginatedLeads,
  ensureSalesPerformance,
  ensureSalesProfile,
} from "@/lib/crm-normalize";
import type { ApiResponse } from "@/types";
import type {
  CrmBusinessType,
  CrmDashboard,
  CrmDashboardFilters,
  CrmFeedbackType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmLeadFilters,
  CrmCall,
  CrmPhoneDuplicateGroup,
  CrmPhoneMatchResult,
  CrmSalesPerformanceRow,
  CrmSalesProfile,
  CrmStage,
  CrmSubStage,
  PaginatedLeads,
} from "@/types/crm";
import type {
  BulkLeadsInput,
  BusinessTypeInput,
  CreateLeadInput,
  FeedbackTypeInput,
  LeadActivityInput,
  LeadCallInput,
  LeadFeedbackInput,
  StageInput,
  SubStageInput,
  UpdateLeadInput,
} from "@/schemas/crm.schema";

function withData<T>(
  res: ApiResponse<unknown>,
  data: T
): ApiResponse<T> {
  return { ...res, data };
}

export async function fetchCrmStages(): Promise<ApiResponse<CrmStage[]>> {
  const res = await api.get(API_ROUTES.crm.stages, []);
  return withData(res, ensureCrmList<CrmStage>(res.data));
}

export async function putCrmStage(
  body: StageInput
): Promise<ApiResponse<CrmStage | null>> {
  return api.put(API_ROUTES.crm.stages, body, null);
}

export async function reorderCrmStages(
  ids: string[]
): Promise<ApiResponse<CrmStage[]>> {
  const res = await api.post(API_ROUTES.crm.stagesReorder, { ids }, []);
  return withData(res, ensureCrmList<CrmStage>(res.data));
}

export async function deleteCrmStage(
  id: string,
  moveToStageId?: string
): Promise<ApiResponse<{ ok: boolean; leadCount?: number }>> {
  return api.delete(
    `${API_ROUTES.crm.stageById(id)}${toQuery({ moveToStageId })}`,
    { ok: false }
  );
}

export async function putCrmSubStage(
  body: SubStageInput
): Promise<ApiResponse<CrmSubStage | null>> {
  return api.put(API_ROUTES.crm.subStages, body, null);
}

export async function reorderCrmSubStages(
  stageId: string,
  ids: string[]
): Promise<ApiResponse<CrmSubStage[]>> {
  const res = await api.post(
    API_ROUTES.crm.subStagesReorder,
    { stageId, ids },
    []
  );
  return withData(res, ensureCrmList<CrmSubStage>(res.data));
}

export async function deleteCrmSubStage(
  id: string
): Promise<ApiResponse<{ ok: boolean; leadCount?: number }>> {
  return api.delete(API_ROUTES.crm.subStageById(id), { ok: false });
}

export async function fetchCrmFeedbackTypes(): Promise<
  ApiResponse<CrmFeedbackType[]>
> {
  const res = await api.get(API_ROUTES.crm.feedbackTypes, []);
  return withData(res, ensureCrmList<CrmFeedbackType>(res.data));
}

export async function putCrmFeedbackType(
  body: FeedbackTypeInput
): Promise<ApiResponse<CrmFeedbackType | null>> {
  return api.put(API_ROUTES.crm.feedbackTypes, body, null);
}

export async function deleteCrmFeedbackType(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(API_ROUTES.crm.feedbackTypeById(id), { ok: false });
}

export async function fetchCrmBusinessTypes(): Promise<
  ApiResponse<CrmBusinessType[]>
> {
  const res = await api.get(API_ROUTES.crm.businessTypes, []);
  return withData(res, ensureCrmList<CrmBusinessType>(res.data));
}

export async function putCrmBusinessType(
  body: BusinessTypeInput
): Promise<ApiResponse<CrmBusinessType | null>> {
  return api.put(API_ROUTES.crm.businessTypes, body, null);
}

export async function deleteCrmBusinessType(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(API_ROUTES.crm.businessTypeById(id), { ok: false });
}

export async function fetchCrmLeads(
  filters: CrmLeadFilters = {}
): Promise<ApiResponse<PaginatedLeads>> {
  const res = await api.get(
    `${API_ROUTES.crm.leads}${toQuery({
      search: filters.search,
      stageId: filters.stageId,
      subStageId: filters.subStageId,
      status: filters.status || undefined,
      source: filters.source || undefined,
      ownerEmployeeId: filters.ownerEmployeeId,
      tag: filters.tag || undefined,
      followUp: filters.followUp || undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      range: filters.range,
      page: filters.page,
      pageSize: filters.pageSize,
      sort: filters.sort,
      order: filters.order,
    })}`,
    emptyPaginatedLeads(filters.page, filters.pageSize)
  );
  return withData(res, ensurePaginatedLeads(res.data));
}

export async function fetchCrmLead(
  id: string
): Promise<ApiResponse<CrmLead | null>> {
  return api.get(API_ROUTES.crm.leadById(id), null);
}

export async function postCrmLead(
  body: CreateLeadInput
): Promise<ApiResponse<CrmLead | null>> {
  return api.post(API_ROUTES.crm.leads, body, null);
}

export async function patchCrmLead(
  id: string,
  body: UpdateLeadInput
): Promise<ApiResponse<CrmLead | null>> {
  return api.patch(API_ROUTES.crm.leadById(id), body, null);
}

export async function deleteCrmLead(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  return api.delete(API_ROUTES.crm.leadById(id), { ok: false });
}

export async function postCrmBulkLeads(
  body: BulkLeadsInput
): Promise<ApiResponse<{ updated: number }>> {
  return api.post(API_ROUTES.crm.leadsBulk, body, { updated: 0 });
}

export type CrmLeadsImportResult = {
  created: number;
  failed: number;
  total: number;
  results: Array<{ row: number; ok: boolean; id?: string; message?: string }>;
};

export async function postCrmLeadsImport(
  rows: Array<Record<string, unknown>>
): Promise<ApiResponse<CrmLeadsImportResult | null>> {
  return api.post(API_ROUTES.crm.leadsImport, { rows }, null);
}

export async function fetchCrmLeadsExport(
  filters: CrmLeadFilters = {}
): Promise<ApiResponse<Array<Record<string, string>>>> {
  return api.get(
    `${API_ROUTES.crm.leadsExport}${toQuery(filters as Record<string, string | undefined>)}`,
    []
  );
}

export async function postCrmLeadActivity(
  leadId: string,
  body: LeadActivityInput
): Promise<ApiResponse<CrmLeadActivity | null>> {
  return api.post(API_ROUTES.crm.leadActivities(leadId), body, null);
}

export async function fetchCrmLeadTimeline(
  leadId: string
): Promise<ApiResponse<CrmLeadActivity[]>> {
  const res = await api.get(API_ROUTES.crm.leadTimeline(leadId), []);
  return withData(res, ensureLeadTimeline(res.data));
}

export async function postCrmLeadFeedback(
  leadId: string,
  body: LeadFeedbackInput
): Promise<ApiResponse<CrmLeadFeedback | null>> {
  return api.post(API_ROUTES.crm.leadFeedback(leadId), body, null);
}

export async function fetchCrmDashboard(
  filters: CrmDashboardFilters = {}
): Promise<ApiResponse<CrmDashboard>> {
  const res = await api.get(
    `${API_ROUTES.crm.dashboard}${toQuery({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      range: filters.range,
      hour:
        filters.hour === undefined || filters.hour === null
          ? undefined
          : String(filters.hour),
      ownerEmployeeId: filters.ownerEmployeeId,
      source: filters.source || undefined,
      stageId: filters.stageId,
      status: filters.status || undefined,
    })}`,
    emptyCrmDashboard()
  );
  return withData(res, ensureCrmDashboard(res.data));
}

export async function fetchCrmPerformance(): Promise<
  ApiResponse<CrmSalesPerformanceRow[]>
> {
  const res = await api.get(API_ROUTES.crm.performance, []);
  return withData(res, ensureSalesPerformance(res.data));
}

export async function fetchCrmSalesProfile(
  employeeId: string
): Promise<ApiResponse<CrmSalesProfile | null>> {
  const res = await api.get(
    API_ROUTES.crm.performanceByEmployee(employeeId),
    null
  );
  return withData(res, ensureSalesProfile(res.data));
}

export async function fetchCrmFeedbackList(
  filters: {
    leadId?: string;
    feedbackTypeId?: string;
    pageSize?: number;
  } = {}
): Promise<ApiResponse<CrmLeadFeedback[]>> {
  const res = await api.get(
    `${API_ROUTES.crm.feedback}${toQuery({
      leadId: filters.leadId,
      feedbackTypeId: filters.feedbackTypeId,
      page: 1,
      pageSize: filters.pageSize ?? 100,
    })}`,
    []
  );
  return withData(res, ensureLeadFeedbackList(res.data));
}

export async function fetchCrmActivities(limit = 50): Promise<
  ApiResponse<CrmLeadActivity[]>
> {
  const res = await api.get(
    `${API_ROUTES.crm.activities}${toQuery({ page: 1, pageSize: limit })}`,
    []
  );
  return withData(res, ensureCrmList<CrmLeadActivity>(res.data));
}

export async function fetchCrmLeadMatch(
  phone: string
): Promise<ApiResponse<CrmPhoneMatchResult | null>> {
  return api.get(
    `${API_ROUTES.crm.leadMatch}${toQuery({ phone })}`,
    null
  );
}

export async function fetchCrmPhoneDuplicates(): Promise<
  ApiResponse<CrmPhoneDuplicateGroup[]>
> {
  const res = await api.get(API_ROUTES.crm.leadDuplicates, []);
  return withData(res, ensureCrmList<CrmPhoneDuplicateGroup>(res.data));
}

export async function postCrmLeadCall(
  leadId: string,
  body: LeadCallInput
): Promise<ApiResponse<CrmCall | null>> {
  return api.post(API_ROUTES.crm.leadCalls(leadId), body, null);
}
