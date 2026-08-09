/** Seed data + shared numeric constants for the CRM module. */
import type { CrmStageCategory } from "@prisma/client";

export const CRM_SYSTEM_ACTOR_ID = "system";

export const DEFAULT_STAGE_COLOR = "#64748b";

export const DEFAULT_STAGES: Array<{
  name: string;
  color: string;
  sortOrder: number;
  category: CrmStageCategory;
  conversionProbability: number | null;
}> = [
  { name: "New Lead", color: "#64748b", sortOrder: 0, category: "open", conversionProbability: 10 },
  { name: "Contacted", color: "#3b82f6", sortOrder: 1, category: "open", conversionProbability: 20 },
  { name: "Qualified", color: "#8b5cf6", sortOrder: 2, category: "open", conversionProbability: 35 },
  { name: "Interested", color: "#06b6d4", sortOrder: 3, category: "open", conversionProbability: 50 },
  { name: "Meeting", color: "#f59e0b", sortOrder: 4, category: "open", conversionProbability: 60 },
  { name: "Proposal", color: "#f97316", sortOrder: 5, category: "open", conversionProbability: 70 },
  { name: "Negotiation", color: "#eab308", sortOrder: 6, category: "open", conversionProbability: 80 },
  { name: "Won", color: "#22c55e", sortOrder: 7, category: "won", conversionProbability: 100 },
  { name: "Lost", color: "#ef4444", sortOrder: 8, category: "lost", conversionProbability: 0 },
];

export const DEFAULT_BUSINESS_TYPES: Array<{
  name: string;
  sortOrder: number;
}> = [
  { name: "Technology", sortOrder: 0 },
  { name: "Healthcare", sortOrder: 1 },
  { name: "Education", sortOrder: 2 },
  { name: "Retail", sortOrder: 3 },
  { name: "Real Estate", sortOrder: 4 },
  { name: "Manufacturing", sortOrder: 5 },
  { name: "Finance", sortOrder: 6 },
  { name: "Food & Beverage", sortOrder: 7 },
  { name: "Construction", sortOrder: 8 },
  { name: "Other", sortOrder: 9 },
];

export const DEFAULT_FEEDBACK_TYPES: Array<{
  name: string;
  sortOrder: number;
  isLossReason: boolean;
}> = [
  { name: "Interested", sortOrder: 0, isLossReason: false },
  { name: "Not Interested", sortOrder: 1, isLossReason: true },
  { name: "Price Issue", sortOrder: 2, isLossReason: true },
  { name: "Timing Issue", sortOrder: 3, isLossReason: true },
  { name: "Needs More Information", sortOrder: 4, isLossReason: false },
  { name: "Competitor", sortOrder: 5, isLossReason: true },
  { name: "No Response", sortOrder: 6, isLossReason: true },
  { name: "Wrong Lead", sortOrder: 7, isLossReason: true },
  { name: "Budget Issue", sortOrder: 8, isLossReason: true },
  { name: "Feature Request", sortOrder: 9, isLossReason: false },
  { name: "Other", sortOrder: 10, isLossReason: false },
];

// Pagination.
export const DEFAULT_PAGE = 1;
export const MIN_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_LEADS_PAGE_SIZE = 20;
export const DEFAULT_ACTIVITIES_PAGE_SIZE = 20;
export const DEFAULT_FEEDBACK_PAGE_SIZE = 100;
export const PERFORMANCE_PROFILE_RECENT_LIMIT = 30;
/** Max leads accepted in a single CSV/API import or export batch. */
export const CRM_IMPORT_MAX_ROWS = 500;

export function clampPage(value: number): number {
  return Math.max(DEFAULT_PAGE, value);
}

export function clampPageSize(value: number, fallback: number): number {
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, value || fallback));
}
