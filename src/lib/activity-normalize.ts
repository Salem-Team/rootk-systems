import { toIsoString } from "@/lib/api-adapters";
import type { Activity } from "@/types";

/** Harden a single Activity row from API/DB so the feed never gets undefined fields. */
export function ensureActivity(raw: unknown): Activity | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<Activity> & { id?: string };
  if (!row.id) return null;
  return {
    id: row.id,
    type: typeof row.type === "string" && row.type ? row.type : "announcement",
    employeeId: row.employeeId,
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    timestamp: toIsoString(row.timestamp) || new Date().toISOString(),
    companyId: row.companyId ?? "",
    createdAt: toIsoString(row.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(row.updatedAt) || new Date().toISOString(),
    createdBy: row.createdBy ?? "",
    updatedBy: row.updatedBy ?? "",
    deletedAt: row.deletedAt ?? null,
    isArchived: Boolean(row.isArchived),
    version: typeof row.version === "number" ? row.version : 1,
    metadata: row.metadata ?? {},
  };
}

export function ensureActivities(raw: unknown): Activity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ensureActivity(item))
    .filter((item): item is Activity => item !== null);
}
