import { fetchCrmDashboard, fetchCrmPerformance, fetchCrmSalesProfile } from "@/api/crm.api";
import { isApiMode } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { buildCrmDashboard, buildSalesProfile } from "@/lib/crm-analytics";
import {
  emptyCrmDashboard,
  ensureCrmDashboard,
  ensureSalesPerformance,
  ensureSalesProfile,
} from "@/lib/crm-normalize";
import {
  crmLeadActivityRepository,
  crmLeadFeedbackRepository,
  crmLeadRepository,
} from "@/repositories/crm.repository";
import { employeeRepository } from "@/repositories";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import type { ApiResponse } from "@/types";
import type {
  CrmDashboard,
  CrmDashboardFilters,
  CrmSalesPerformanceRow,
  CrmSalesProfile,
} from "@/types/crm";
import { actorEmployeeId, assertCap, ensureCatalog, isAdmin } from "@/services/crm/crm-shared";

export async function getCrmDashboard(
  filters: CrmDashboardFilters = {}
): Promise<ApiResponse<CrmDashboard>> {
  if (isApiMode()) return fetchCrmDashboard(filters);
  try {
    await simulateDelay();
    assertCap("view_dashboard");
    const { stages, feedbackTypes } = await ensureCatalog();
    const [leads, feedback, employees] = await Promise.all([
      crmLeadRepository.findAll(),
      crmLeadFeedbackRepository.findAll(),
      employeeRepository.findAll(),
    ]);
    const data = ensureCrmDashboard(
      buildCrmDashboard(
        leads,
        stages,
        feedbackTypes,
        feedback,
        employees,
        filters,
        { actorEmployeeId: actorEmployeeId(), isAdmin: isAdmin() }
      )
    );
    return ok(data);
  } catch (error) {
    return fromError(error, emptyCrmDashboard());
  }
}

export async function getCrmPerformance(): Promise<
  ApiResponse<CrmSalesPerformanceRow[]>
> {
  if (isApiMode()) {
    const res = await fetchCrmPerformance();
    return { ...res, data: ensureSalesPerformance(res.data) };
  }
  try {
    await simulateDelay();
    assertCap("view_performance");
    const dash = await getCrmDashboard({ range: "all" });
    return ok(ensureSalesPerformance(dash.data.salesPerformance));
  } catch (error) {
    return fromError(error, []);
  }
}

export async function getCrmSalesProfile(
  employeeId: string
): Promise<ApiResponse<CrmSalesProfile | null>> {
  if (isApiMode()) {
    const res = await fetchCrmSalesProfile(employeeId);
    return { ...res, data: ensureSalesProfile(res.data) };
  }
  try {
    await simulateDelay();
    assertCap("view_performance");
    const { stages } = await ensureCatalog();
    const [leads, activities, feedback, employees] = await Promise.all([
      crmLeadRepository.findAll(),
      crmLeadActivityRepository.findAll(),
      crmLeadFeedbackRepository.findAll(),
      employeeRepository.findAll(),
    ]);
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) throw new NotFoundError("Sales user not found");
    return ok(
      buildSalesProfile(
        employeeId,
        emp.name,
        leads,
        stages,
        activities,
        feedback
      )
    );
  } catch (error) {
    return fromError(error, null);
  }
}
