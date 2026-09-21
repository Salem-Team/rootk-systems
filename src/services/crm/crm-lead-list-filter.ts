import { filterLeads, type CrmLeadScopeOpts } from "@/lib/crm/lead-filters";
import { indexLeadSearchText } from "@/lib/crm/lead-search-index";
import { employeeRepository } from "@/repositories";
import {
  crmLeadActivityRepository,
  crmLeadFeedbackRepository,
} from "@/repositories/crm.repository";
import { ensureCatalog } from "@/services/crm/crm-shared";
import type { CrmLead, CrmLeadFilters } from "@/types/crm";

/** Local lead list filter, including feedback / budget-adjacent catalog text. */
export async function filterStoredLeads(
  leads: CrmLead[],
  filters: CrmLeadFilters,
  scope: CrmLeadScopeOpts
): Promise<CrmLead[]> {
  if (!filters.search?.trim()) return filterLeads(leads, filters, scope);

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

  return filterLeads(leads, filters, { ...scope, searchTextByLeadId });
}
