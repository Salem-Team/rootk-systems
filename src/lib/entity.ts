import { DEFAULT_COMPANY_ID } from "@/constants/company";
import type { BaseEntity, EntityMetadata } from "@/types";

const SYSTEM_ACTOR = "system";

export function nowIso(): string {
  return new Date().toISOString();
}

export function createAuditFields(
  actorId: string = SYSTEM_ACTOR,
  overrides?: Partial<BaseEntity>
): BaseEntity {
  const stamp = nowIso();
  return {
    companyId: overrides?.companyId ?? DEFAULT_COMPANY_ID,
    createdAt: overrides?.createdAt ?? stamp,
    updatedAt: overrides?.updatedAt ?? stamp,
    createdBy: overrides?.createdBy ?? actorId,
    updatedBy: overrides?.updatedBy ?? actorId,
    deletedAt: overrides?.deletedAt ?? null,
    isArchived: overrides?.isArchived ?? false,
    version: overrides?.version ?? 1,
    metadata: overrides?.metadata ?? {},
  };
}

export function touchEntity<T extends BaseEntity>(
  entity: T,
  actorId: string = SYSTEM_ACTOR,
  patch: Partial<T> = {}
): T {
  return {
    ...entity,
    ...patch,
    updatedAt: nowIso(),
    updatedBy: actorId,
    version: (entity.version ?? 1) + 1,
    metadata: (patch.metadata as EntityMetadata | undefined) ?? entity.metadata,
  };
}

export function enrichWithAudit<T extends object>(
  entity: T,
  actorId: string = SYSTEM_ACTOR,
  overrides?: Partial<BaseEntity>
): T & BaseEntity {
  return {
    ...entity,
    ...createAuditFields(actorId, overrides),
  };
}
