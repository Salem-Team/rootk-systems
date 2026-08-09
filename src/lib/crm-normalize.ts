import { unwrapList, type ListPayload } from "@/api/contracts";
import { ensureCrmDashboard, emptyCrmDashboard } from "@/lib/crm-dashboard-normalize";
import type {
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmSalesPerformanceRow,
  CrmSalesProfile,
  PaginatedLeads,
} from "@/types/crm";

export { ensureCrmDashboard, emptyCrmDashboard };

/**
 * Always return an array from:
 * - bare list
 * - `{ items }` / `{ data }` paginated envelopes
 * - accidental timeline payload `{ activities }`
 * Never throw; never return a non-array.
 */
export function ensureCrmList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.activities)) return obj.activities as T[];
  // Last resort: unwrapList for typed ListPayload
  return unwrapList(raw as ListPayload<T>);
}

export function emptyPaginatedLeads(
  page = 1,
  pageSize = 20
): PaginatedLeads {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
  };
}

/** Normalize leads list whether paginated envelope or bare array. */
export function ensurePaginatedLeads(raw: unknown): PaginatedLeads {
  const empty = emptyPaginatedLeads();
  if (!raw) return empty;
  if (Array.isArray(raw)) {
    return {
      items: raw as CrmLead[],
      total: raw.length,
      page: 1,
      pageSize: raw.length || 20,
      totalPages: 1,
    };
  }
  if (typeof raw !== "object") return empty;
  const row = raw as Partial<PaginatedLeads> & { data?: CrmLead[] };
  const items = Array.isArray(row.items)
    ? row.items
    : Array.isArray(row.data)
      ? row.data
      : [];
  const page = typeof row.page === "number" ? row.page : 1;
  const pageSize = typeof row.pageSize === "number" ? row.pageSize : 20;
  const total = typeof row.total === "number" ? row.total : items.length;
  const totalPages =
    typeof row.totalPages === "number"
      ? row.totalPages
      : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return { items, total, page, pageSize, totalPages };
}

/**
 * Timeline Nest payload is `{ activities, feedback, history }`.
 * Local mode returns a bare activity array.
 */
export function ensureLeadTimeline(raw: unknown): CrmLeadActivity[] {
  if (Array.isArray(raw)) return raw as CrmLeadActivity[];
  if (!raw || typeof raw !== "object") return [];
  const row = raw as { activities?: unknown };
  return ensureCrmList<CrmLeadActivity>(row.activities);
}

export function ensureLeadFeedbackList(raw: unknown): CrmLeadFeedback[] {
  return ensureCrmList<CrmLeadFeedback>(raw);
}

export function ensureSalesPerformance(
  raw: unknown
): CrmSalesPerformanceRow[] {
  return ensureCrmList<CrmSalesPerformanceRow>(raw).map((row) => ({
    ...row,
    activeCalls: Number(row.activeCalls ?? 0),
    inactiveCalls: Number(row.inactiveCalls ?? 0),
  }));
}

export function ensureSalesProfile(raw: unknown): CrmSalesProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<CrmSalesProfile>;
  if (!row.employeeId) return null;
  const overview = row.overview;
  return {
    employeeId: row.employeeId,
    employeeName: row.employeeName ?? "",
    overview: {
      totalLeads: overview?.totalLeads ?? 0,
      activeLeads: overview?.activeLeads ?? 0,
      won: overview?.won ?? 0,
      lost: overview?.lost ?? 0,
      conversionRate: overview?.conversionRate ?? 0,
      pendingFollowUps: overview?.pendingFollowUps ?? 0,
    },
    pipeline: Array.isArray(row.pipeline) ? row.pipeline : [],
    recentActivities: Array.isArray(row.recentActivities)
      ? row.recentActivities
      : [],
    feedback: Array.isArray(row.feedback) ? row.feedback : [],
  };
}
