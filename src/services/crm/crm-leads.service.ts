import {
  deleteCrmLead,
  fetchCrmLead,
  fetchCrmLeadCounts,
  fetchCrmLeads,
  postCrmBulkLeads,
  type CrmLeadStageCounts,
} from "@/api/crm.api";
import { isApiMode } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { filterLeads } from "@/lib/crm-analytics";
import { ensurePaginatedLeads } from "@/lib/crm-normalize";
import { emitCrmUpdated } from "@/lib/events";
import { crmLeadRepository } from "@/repositories/crm.repository";
import {
  bulkLeadsSchema,
  type BulkLeadsInput,
} from "@/schemas/crm.schema";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { CrmLead, CrmLeadFilters, PaginatedLeads } from "@/types/crm";
import {
  assertCap,
  assertLeadAccess,
  crmLeadFilterScope,
  ensureCatalog,
  scopeCrmFiltersToActor,
  writeHistory,
} from "@/services/crm/crm-shared";
import { updateCrmLead } from "@/services/crm/crm-lead-mutations.service";

export { createCrmLead, updateCrmLead } from "@/services/crm/crm-lead-mutations.service";

export async function getCrmLeadCounts(
  filters: Pick<
    CrmLeadFilters,
    "status" | "source" | "ownerEmployeeId" | "search" | "tag" | "followUp"
  > = {}
): Promise<ApiResponse<CrmLeadStageCounts>> {
  const scoped = scopeCrmFiltersToActor(filters);
  if (isApiMode()) {
    return fetchCrmLeadCounts(scoped);
  }
  try {
    await simulateDelay();
    assertCap("view");
    await ensureCatalog();
    const all = await crmLeadRepository.findAll();
    const filtered = filterLeads(
      all,
      { ...scoped, status: scoped.status ?? "active" },
      await crmLeadFilterScope()
    );
    const byStage: Record<string, number> = {};
    for (const lead of filtered) {
      byStage[lead.stageId] = (byStage[lead.stageId] ?? 0) + 1;
    }
    return ok({ total: filtered.length, byStage });
  } catch (error) {
    return fromError(error, { total: 0, byStage: {} });
  }
}

export async function getCrmLeads(
  filters: CrmLeadFilters = {}
): Promise<ApiResponse<PaginatedLeads>> {
  const scoped = scopeCrmFiltersToActor(filters);
  if (isApiMode()) {
    const res = await fetchCrmLeads(scoped);
    return { ...res, data: ensurePaginatedLeads(res.data) };
  }
  try {
    await simulateDelay();
    assertCap("view");
    await ensureCatalog();
    const all = await crmLeadRepository.findAll();
    let filtered = filterLeads(all, scoped, await crmLeadFilterScope());
    const sort = filters.sort ?? "updatedAt";
    const order = filters.order ?? "desc";
    filtered = [...filtered].sort((a, b) => {
      const av = String(a[sort] ?? "");
      const bv = String(b[sort] ?? "");
      return order === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return ok({
      items: filtered.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    return fromError(error, {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  }
}

export async function getCrmLead(
  id: string
): Promise<ApiResponse<CrmLead | null>> {
  if (isApiMode()) {
    const res = await fetchCrmLead(id);
    if (res.data) {
      try {
        await assertLeadAccess(res.data);
      } catch (error) {
        return fromError(error, null);
      }
    }
    return res;
  }
  try {
    await simulateDelay();
    assertCap("view");
    const lead = await crmLeadRepository.findById(id);
    if (!lead) throw new NotFoundError("Lead not found");
    await assertLeadAccess(lead);
    return ok(lead);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function removeCrmLead(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return deleteCrmLead(id);
  try {
    assertCap("delete");
    await simulateDelay();
    const existing = await crmLeadRepository.findById(id);
    if (!existing) throw new NotFoundError("Lead not found");
    await assertLeadAccess(existing);
    await crmLeadRepository.delete(id);
    await writeHistory({
      leadId: id,
      action: "lead_deleted",
      actorId: getSessionUserId() || "system",
      actorName: "",
      note: "Lead deleted",
      previousValue: existing.name,
      newValue: null,
    });
    emitCrmUpdated();
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}

export async function bulkUpdateCrmLeads(
  input: BulkLeadsInput
): Promise<ApiResponse<{ updated: number }>> {
  if (isApiMode()) return postCrmBulkLeads(input);
  try {
    assertCap("edit");
    await simulateDelay();
    const parsed = bulkLeadsSchema.parse(input);
    if (parsed.action === "assign") assertCap("assign");
    let updated = 0;
    for (const id of parsed.ids) {
      if (parsed.action === "assign") {
        const res = await updateCrmLead(id, {
          ownerEmployeeId: parsed.value || null,
        });
        if (res.success) updated++;
      } else if (parsed.action === "change_stage") {
        const res = await updateCrmLead(id, { stageId: parsed.value });
        if (res.success) updated++;
      } else if (parsed.action === "change_status") {
        const res = await updateCrmLead(id, {
          status: (parsed.value as CrmLead["status"]) ?? "active",
        });
        if (res.success) updated++;
      } else if (parsed.action === "archive") {
        const res = await updateCrmLead(id, { status: "archived" });
        if (res.success) updated++;
      } else if (parsed.action === "delete") {
        const res = await removeCrmLead(id);
        if (res.success) updated++;
      }
    }
    return ok({ updated });
  } catch (error) {
    return fromError(error, { updated: 0 });
  }
}
