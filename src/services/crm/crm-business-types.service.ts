import {
  deleteCrmBusinessType,
  fetchCrmBusinessTypes,
  putCrmBusinessType,
} from "@/api/crm.api";
import { isApiMode } from "@/lib/env";
import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { ensureCrmList } from "@/lib/crm-normalize";
import { emitCrmUpdated } from "@/lib/events";
import {
  crmBusinessTypeRepository,
  crmLeadRepository,
} from "@/repositories/crm.repository";
import {
  businessTypeSchema,
  type BusinessTypeInput,
} from "@/schemas/crm.schema";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionUserId } from "@/stores/session-store";
import type { ApiResponse } from "@/types";
import type { CrmBusinessType } from "@/types/crm";
import { assertCap, ensureCatalog } from "@/services/crm/crm-shared";

export async function getCrmBusinessTypes(): Promise<
  ApiResponse<CrmBusinessType[]>
> {
  if (isApiMode()) {
    const res = await fetchCrmBusinessTypes();
    return { ...res, data: ensureCrmList(res.data) };
  }
  try {
    await simulateDelay();
    const { businessTypes } = await ensureCatalog();
    return ok(businessTypes);
  } catch (error) {
    return fromError(error, []);
  }
}

export async function upsertCrmBusinessType(
  input: BusinessTypeInput
): Promise<ApiResponse<CrmBusinessType | null>> {
  if (isApiMode()) return putCrmBusinessType(input);
  try {
    assertCap("manage_business_types");
    await simulateDelay();
    const parsed = businessTypeSchema.parse(input);
    const actorId = getSessionUserId() || "system";
    if (parsed.id) {
      const existing = await crmBusinessTypeRepository.findById(parsed.id);
      if (!existing) throw new NotFoundError("Business type not found");
      const updated = touchEntity(existing, actorId, {
        name: parsed.name,
        description: parsed.description ?? "",
        sortOrder: parsed.sortOrder ?? existing.sortOrder,
        active: parsed.active,
      });
      await crmBusinessTypeRepository.update(updated.id, updated);
      emitCrmUpdated();
      return ok(updated);
    }
    const all = await crmBusinessTypeRepository.findAll();
    const row = enrichWithAudit(
      {
        id: createId("crm-bt"),
        name: parsed.name,
        description: parsed.description ?? "",
        sortOrder: parsed.sortOrder ?? all.length,
        active: parsed.active ?? true,
      },
      actorId
    );
    await crmBusinessTypeRepository.create(row);
    emitCrmUpdated();
    return ok(row);
  } catch (error) {
    return fromError(error, null);
  }
}

export async function removeCrmBusinessType(
  id: string
): Promise<ApiResponse<{ ok: boolean }>> {
  if (isApiMode()) return deleteCrmBusinessType(id);
  try {
    assertCap("manage_business_types");
    await simulateDelay();
    const used = (await crmLeadRepository.findAll()).some(
      (l) => l.businessTypeId === id
    );
    if (used) {
      throw new ValidationError(
        "This business type is in use. Deactivate it instead of deleting."
      );
    }
    await crmBusinessTypeRepository.delete(id);
    emitCrmUpdated();
    return ok({ ok: true });
  } catch (error) {
    return fromError(error, { ok: false });
  }
}
