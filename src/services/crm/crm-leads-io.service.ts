import {
  fetchCrmLeadsExport,
  postCrmLeadsImport,
  type CrmLeadsImportResult,
} from "@/api/crm.api";
import { filterLeads } from "@/lib/crm-analytics";
import { isApiMode } from "@/lib/env";
import {
  normalizeSource,
  normalizeStatus,
  parseTagsCell,
  type CrmLeadCsvRow,
} from "@/lib/crm/leads-csv";
import { emitCrmUpdated } from "@/lib/events";
import { employeeRepository } from "@/repositories";
import { crmLeadRepository } from "@/repositories/crm.repository";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { createCrmLead } from "@/services/crm/crm-lead-mutations.service";
import {
  actorEmployeeId,
  assertCap,
  ensureCatalog,
  isAdmin,
  scopeCrmFiltersToActor,
} from "@/services/crm/crm-shared";
import type { ApiResponse } from "@/types";
import type { CrmLeadFilters, CrmNextAction } from "@/types/crm";

const NEXT_ACTIONS = new Set<CrmNextAction>([
  "call",
  "whatsapp",
  "email",
  "meeting",
  "follow_up",
  "send_proposal",
  "none",
]);

export async function importCrmLeads(
  rows: CrmLeadCsvRow[]
): Promise<ApiResponse<CrmLeadsImportResult | null>> {
  if (isApiMode()) {
    return postCrmLeadsImport(
      rows.map((r) => ({
        name: r.name,
        phone: r.phone,
        email: r.email,
        companyName: r.companyName,
        businessType: r.businessType,
        source: normalizeSource(r.source),
        stage: r.stage,
        owner: r.owner,
        status: normalizeStatus(r.status),
        tags: parseTagsCell(r.tags),
        nextAction: NEXT_ACTIONS.has(r.nextAction as CrmNextAction)
          ? r.nextAction
          : "none",
        notes: r.notes,
      }))
    );
  }

  try {
    assertCap("create");
    await simulateDelay();
    const { stages, businessTypes } = await ensureCatalog();
    const employees = await employeeRepository.findAll();
    const stageByKey = new Map<string, string>();
    for (const s of stages) {
      stageByKey.set(s.id, s.id);
      stageByKey.set(s.name.trim().toLowerCase(), s.id);
    }
    const businessTypeByKey = new Map<string, string>();
    for (const b of businessTypes) {
      businessTypeByKey.set(b.id, b.id);
      businessTypeByKey.set(b.name.trim().toLowerCase(), b.id);
    }
    const defaultStageId = stages.find((s) => s.active)?.id ?? stages[0]?.id;
    if (!defaultStageId) {
      return fromError(new Error("No CRM stages configured"), null);
    }
    const ownerByKey = new Map<string, string>();
    for (const e of employees) {
      ownerByKey.set(e.id, e.id);
      ownerByKey.set(e.name.trim().toLowerCase(), e.id);
      if (e.email) ownerByKey.set(e.email.trim().toLowerCase(), e.id);
    }

    const results: CrmLeadsImportResult["results"] = [];
    let created = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNum = i + 1;
      try {
        const stageId =
          (row.stage
            ? stageByKey.get(row.stage) ||
              stageByKey.get(row.stage.toLowerCase())
            : null) ?? defaultStageId;
        let ownerEmployeeId: string | null = null;
        if (row.owner) {
          ownerEmployeeId =
            ownerByKey.get(row.owner) ||
            ownerByKey.get(row.owner.toLowerCase()) ||
            null;
        }
        if (!isAdmin()) ownerEmployeeId = actorEmployeeId();
        const businessTypeId = row.businessType
          ? businessTypeByKey.get(row.businessType) ||
            businessTypeByKey.get(row.businessType.toLowerCase()) ||
            null
          : null;
        const res = await createCrmLead({
          name: row.name,
          phone: row.phone,
          email: row.email,
          companyName: row.companyName,
          businessTypeId,
          source: normalizeSource(row.source),
          stageId,
          ownerEmployeeId,
          status: normalizeStatus(row.status),
          tags: parseTagsCell(row.tags),
          nextAction: NEXT_ACTIONS.has(row.nextAction as CrmNextAction)
            ? (row.nextAction as CrmNextAction)
            : "none",
          notes: row.notes,
        });
        if (!res.success || !res.data) {
          failed += 1;
          results.push({
            row: rowNum,
            ok: false,
            message: res.message ?? "Failed",
          });
          continue;
        }
        created += 1;
        results.push({ row: rowNum, ok: true, id: res.data.id });
      } catch (error) {
        failed += 1;
        results.push({
          row: rowNum,
          ok: false,
          message: error instanceof Error ? error.message : "Failed",
        });
      }
    }
    emitCrmUpdated();
    return ok({ created, failed, total: rows.length, results });
  } catch (error) {
    return fromError(error, null);
  }
}

/** Export leads as normalized row objects for Excel download. */
export async function exportCrmLeadRows(
  filters: CrmLeadFilters = {}
): Promise<ApiResponse<Array<Record<string, string>>>> {
  if (isApiMode()) return fetchCrmLeadsExport(scopeCrmFiltersToActor(filters));

  try {
    assertCap("view");
    await simulateDelay();
    const { stages, businessTypes } = await ensureCatalog();
    const [all, employees] = await Promise.all([
      crmLeadRepository.findAll(),
      employeeRepository.findAll(),
    ]);
    const filtered = filterLeads(all, scopeCrmFiltersToActor(filters), {
      actorEmployeeId: actorEmployeeId(),
      isAdmin: isAdmin(),
    });
    const stageName = new Map(stages.map((s) => [s.id, s.name]));
    const businessName = new Map(businessTypes.map((b) => [b.id, b.name]));
    const ownerName = new Map(employees.map((e) => [e.id, e.name]));
    return ok(
      filtered.slice(0, 500).map((lead) => ({
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? "",
        companyName: lead.companyName ?? "",
        businessType: lead.businessTypeId
          ? businessName.get(lead.businessTypeId) ?? lead.businessTypeId
          : "",
        source: lead.source,
        stage: stageName.get(lead.stageId) ?? lead.stageId,
        owner: lead.ownerEmployeeId
          ? ownerName.get(lead.ownerEmployeeId) ?? lead.ownerEmployeeId
          : "",
        status: lead.status,
        tags: (lead.tags ?? []).join(";"),
        nextAction: lead.nextAction ?? "none",
        notes: lead.notes ?? "",
      }))
    );
  } catch (error) {
    return fromError(error, []);
  }
}
