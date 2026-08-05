/**
 * Date / entity adapters between Prisma (DateTime, Decimal) and frontend (ISO strings).
 * Nest serializers should emit ISO-8601 strings; these helpers harden the client.
 */

export function toIsoString(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function toIsoOrNull(
  value: string | Date | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return toIsoString(value);
}

/** Normalize Nest entity timestamps onto BaseEntity-shaped objects. */
export function normalizeAuditTimestamps<
  T extends {
    createdAt?: string | Date;
    updatedAt?: string | Date;
    deletedAt?: string | Date | null;
  },
>(entity: T): T & { createdAt: string; updatedAt: string; deletedAt: string | null } {
  return {
    ...entity,
    createdAt: toIsoString(entity.createdAt),
    updatedAt: toIsoString(entity.updatedAt),
    deletedAt: toIsoOrNull(entity.deletedAt),
  };
}

/** Prisma Decimal / number → JS number for money fields. */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
