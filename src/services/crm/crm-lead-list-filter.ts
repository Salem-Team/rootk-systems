import { isAdminRole } from "@/constants/roles";
import { filterLeads, type CrmLeadScopeOpts } from "@/lib/crm/lead-filters";
import { indexLeadSearchText } from "@/lib/crm/lead-search-index";
import { employeeRepository } from "@/repositories";
import {
  crmLeadActivityRepository,
  crmLeadFeedbackRepository,
} from "@/repositories/crm.repository";
import { ensureCatalog } from "@/services/crm/crm-shared";
import { getSessionRole } from "@/stores/session-store";
import type { CrmLead, CrmLeadFilters } from "@/types/crm";

/** Which stored rows the actor is allowed to page through. */
export function leadListMode(
  filters: CrmLeadFilters
): "live" | "deleted" | "withDeleted" {
  if (!isAdminRole(getSessionRole())) return "live";
  if (filters.status === "deleted") return "deleted";
  if (filters.search?.trim() && !filters.status) return "withDeleted";
  return "live";
}

export function includeDeletedLeadMatches(filters: CrmLeadFilters): boolean {
  return leadListMode(filters) === "withDeleted";
}
export async function filterStoredLeads(
  leads: CrmLead[],
  filters: CrmLeadFilters,
  scope: CrmLeadScopeOpts
): Promise<CrmLead[]> {
  if (!filters.search?.trim()) {
    return filterLeads(leads, filters, {
      ...scope,
      includeDeletedMatches: includeDeletedLeadMatches(filters),
    });
  }

  const [
    { stages, subStages, feedbackTypes, businessTypes },
    feedback,
    activities,
    employees,
  ] = await Promise.all([
    ensureCatalog(),
    crmLeadFeedbackRepository.findAll(),
    crmLeadActivityRepository.findAll(),
    employeeRepository.findAll(),
  ]);

  const searchTextByLeadId = indexLeadSearchText({
    leads,
    feedback,
    activities,
    feedbackTypes,
    stages,
    subStages,
    businessTypes,
    employees,
  });

  return filterLeads(leads, filters, {
    ...scope,
    includeDeletedMatches: includeDeletedLeadMatches(filters),
    searchTextByLeadId,
  });
}
