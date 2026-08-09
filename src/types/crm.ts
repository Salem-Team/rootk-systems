import type { BaseEntity, PaginatedResult } from "@/types";

export type CrmLeadStatus = "active" | "inactive" | "archived";

export type CrmLeadSource =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "website"
  | "whatsapp"
  | "referral"
  | "organic"
  | "advertisement"
  | "other";

export type CrmNextAction =
  | "call"
  | "whatsapp"
  | "email"
  | "meeting"
  | "follow_up"
  | "send_proposal"
  | "none";

export type CrmStageCategory = "open" | "won" | "lost" | "other";

export type CrmActivityType =
  | "call"
  | "whatsapp"
  | "email"
  | "meeting"
  | "note"
  | "stage_change"
  | "assignment"
  | "feedback"
  | "follow_up"
  | "status_change"
  | "created"
  | "other";

export type CrmLeadTag =
  | "hot"
  | "warm"
  | "cold"
  | "vip"
  | "high_budget"
  | "follow_up"
  | "interested";

export type CrmCapability =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "assign"
  | "manage_stages"
  | "manage_feedback_types"
  | "manage_business_types"
  | "view_dashboard"
  | "view_reports"
  | "view_performance"
  | "view_audit"
  | "export";

export type CrmFollowUpFilter = "today" | "upcoming" | "overdue" | "none";

export type CrmDateRangePreset =
  | "this_week"
  | "last_7_days"
  | "this_month"
  | "all";

export type CrmHistoryAction =
  | "lead_created"
  | "lead_updated"
  | "lead_assigned"
  | "lead_reassigned"
  | "stage_changed"
  | "status_changed"
  | "feedback_added"
  | "feedback_updated"
  | "lead_deleted"
  | "stage_created"
  | "stage_updated"
  | "stage_deleted"
  | "follow_up_created"
  | "follow_up_completed"
  | "activity_added";

export interface CrmSubStage extends BaseEntity {
  id: string;
  stageId: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export interface CrmStage extends BaseEntity {
  id: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  active: boolean;
  conversionProbability: number | null;
  category: CrmStageCategory;
  /** Nested when loaded via stage catalog APIs. */
  subStages?: CrmSubStage[];
}

export interface CrmFeedbackType extends BaseEntity {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
  isLossReason: boolean;
}

/** Company / industry type (مجال عمل العميل). */
export interface CrmBusinessType extends BaseEntity {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export interface CrmLead extends BaseEntity {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyName: string;
  businessTypeId: string | null;
  source: CrmLeadSource;
  ownerEmployeeId: string | null;
  stageId: string;
  subStageId: string | null;
  status: CrmLeadStatus;
  tags: CrmLeadTag[];
  nextAction: CrmNextAction;
  nextFollowUpAt: string | null;
  lastActivityAt: string | null;
  lossReasonTypeId: string | null;
  notes: string;
  convertedAt: string | null;
}

export interface CrmLeadActivity extends BaseEntity {
  id: string;
  leadId: string;
  type: CrmActivityType;
  title: string;
  description: string;
  actorEmployeeId: string | null;
  occurredAt: string;
}

export interface CrmLeadFeedback extends BaseEntity {
  id: string;
  leadId: string;
  feedbackTypeId: string;
  customerFeedback: string;
  /** true = answered (Active Call), false = no answer (Inactive). */
  callAnswered: boolean;
  nextAction: CrmNextAction;
  nextFollowUpAt: string | null;
  notes: string;
  recordedByEmployeeId: string | null;
}

export interface CrmLeadHistoryEvent extends BaseEntity {
  id: string;
  leadId: string | null;
  action: CrmHistoryAction | string;
  actorId: string;
  actorName: string;
  note: string;
  previousValue: string | null;
  newValue: string | null;
}

export interface CrmLeadFilters {
  search?: string;
  stageId?: string;
  subStageId?: string;
  status?: CrmLeadStatus | "";
  source?: CrmLeadSource | "";
  ownerEmployeeId?: string;
  tag?: CrmLeadTag | "";
  followUp?: CrmFollowUpFilter | "";
  dateFrom?: string;
  dateTo?: string;
  range?: CrmDateRangePreset;
  page?: number;
  pageSize?: number;
  sort?: "createdAt" | "updatedAt" | "name" | "nextFollowUpAt" | "lastActivityAt";
  order?: "asc" | "desc";
}

export type PaginatedLeads = PaginatedResult<CrmLead>;

export interface CrmStageCard {
  id: string;
  name: string;
  color: string;
  category: CrmStageCategory;
  count: number;
  percent: number;
  trendPercent: number;
}

export interface CrmKpis {
  totalLeads: number;
  newLeads: number;
  activeLeads: number;
  converted: number;
  conversionRate: number;
}

export interface CrmChartPoint {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface CrmTrendPoint {
  date: string;
  value: number;
}

export interface CrmAttentionItem {
  id: string;
  severity: "critical" | "warning" | "info";
  kind:
    | "overdue_followups"
    | "no_next_action"
    | "inactive_leads"
    | "sales_attention";
  title: string;
  count: number;
  hrefFilter?: Partial<CrmLeadFilters>;
  ownerEmployeeId?: string;
}

export interface CrmInsight {
  id: string;
  text: string;
}

export interface CrmDashboard {
  kpis: CrmKpis;
  stageCards: CrmStageCard[];
  leadsByStage: CrmChartPoint[];
  leadsTrend: CrmTrendPoint[];
  conversionTrend: CrmTrendPoint[];
  feedbackReasons: CrmChartPoint[];
  salesPerformance: CrmSalesPerformanceRow[];
  needsAttention: CrmAttentionItem[];
  insights: CrmInsight[];
}

export interface CrmSalesPerformanceRow {
  employeeId: string;
  employeeName: string;
  leads: number;
  active: number;
  won: number;
  lost: number;
  conversionRate: number;
  followUps: number;
  overdue: number;
  withoutNextAction: number;
  inactive: number;
  /** Feedback calls marked answered (رد). */
  activeCalls: number;
  /** Feedback calls marked no-answer (مردش). */
  inactiveCalls: number;
  needsAttention: boolean;
}

export interface CrmSalesProfile {
  employeeId: string;
  employeeName: string;
  overview: {
    totalLeads: number;
    activeLeads: number;
    won: number;
    lost: number;
    conversionRate: number;
    pendingFollowUps: number;
  };
  pipeline: CrmStageCard[];
  recentActivities: CrmLeadActivity[];
  feedback: CrmLeadFeedback[];
}

export interface CrmDashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  range?: CrmDateRangePreset;
  ownerEmployeeId?: string;
  source?: CrmLeadSource | "";
  stageId?: string;
  status?: CrmLeadStatus | "";
}
