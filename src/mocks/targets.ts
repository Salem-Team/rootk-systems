import { enrichWithAudit } from "@/lib/entity";
import { computeTargetProgress } from "@/lib/target-progress";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetTemplate,
  TargetType,
  TargetWarning,
} from "@/types";

const ACTOR = "user-admin";

export const targetCategoriesSeed: TargetCategory[] = [
  enrichWithAudit(
    {
      id: "tcat-sales",
      name: "Sales",
      color: "#0F766E",
      icon: "Handshake",
      description: "Revenue and pipeline activity",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "tcat-dev",
      name: "Development",
      color: "#082868",
      icon: "Code2",
      description: "Engineering delivery targets",
      active: true,
      sortOrder: 2,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "tcat-mkt",
      name: "Marketing",
      color: "#B45309",
      icon: "Megaphone",
      description: "Campaigns and content",
      active: true,
      sortOrder: 3,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "tcat-support",
      name: "Customer Support",
      color: "#0369A1",
      icon: "Headphones",
      description: "Service quality and response",
      active: true,
      sortOrder: 4,
    },
    ACTOR
  ),
];

export const targetTypesSeed: TargetType[] = [
  enrichWithAudit(
    {
      id: "ttype-calls",
      categoryId: "tcat-sales",
      name: "Calls",
      description: "Outbound sales calls",
      unit: "calls",
      taskTitleTemplate: "Call #{n}",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-meetings",
      categoryId: "tcat-sales",
      name: "Meetings",
      description: "Client meetings",
      unit: "meetings",
      taskTitleTemplate: "Meeting #{n}",
      active: true,
      sortOrder: 2,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-followups",
      categoryId: "tcat-sales",
      name: "Follow Ups",
      description: "Follow-up actions",
      unit: "follow-ups",
      taskTitleTemplate: "Follow Up #{n}",
      active: true,
      sortOrder: 3,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-bugs",
      categoryId: "tcat-dev",
      name: "Bug Fixes",
      description: "Resolved bugs",
      unit: "bugs",
      taskTitleTemplate: "Bug Fix #{n}",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-prs",
      categoryId: "tcat-dev",
      name: "Pull Requests",
      description: "Merged pull requests",
      unit: "PRs",
      taskTitleTemplate: "Pull Request #{n}",
      active: true,
      sortOrder: 2,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-posts",
      categoryId: "tcat-mkt",
      name: "Published Posts",
      description: "Published content pieces",
      unit: "posts",
      taskTitleTemplate: "Publish Post #{n}",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
];

export const targetTemplatesSeed: TargetTemplate[] = [
  enrichWithAudit(
    {
      id: "ttpl-sales-daily",
      categoryId: "tcat-sales",
      name: "Sales Daily Target",
      description: "Standard daily sales activity pack",
      active: true,
      items: [
        {
          id: "tti-1",
          companyId: "",
          templateId: "ttpl-sales-daily",
          typeId: "ttype-calls",
          quantity: 10,
          unit: "calls",
          weight: 1,
          sortOrder: 0,
        },
        {
          id: "tti-2",
          companyId: "",
          templateId: "ttpl-sales-daily",
          typeId: "ttype-followups",
          quantity: 5,
          unit: "follow-ups",
          weight: 1,
          sortOrder: 1,
        },
        {
          id: "tti-3",
          companyId: "",
          templateId: "ttpl-sales-daily",
          typeId: "ttype-meetings",
          quantity: 2,
          unit: "meetings",
          weight: 2,
          sortOrder: 2,
        },
      ],
    },
    ACTOR
  ),
];

function makeTarget(
  partial: Omit<
    PerformanceTarget,
    | "companyId"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "isArchived"
    | "version"
    | "metadata"
    | "health"
    | "riskLevel"
    | "performanceScore"
  > & { completedQuantity: number }
): PerformanceTarget {
  const metrics = computeTargetProgress({
    quantity: partial.quantity,
    completedQuantity: partial.completedQuantity,
    startDate: partial.startDate,
    endDate: partial.endDate,
    status: partial.status,
  });
  return enrichWithAudit(
    {
      ...partial,
      health: metrics.health,
      riskLevel: metrics.riskLevel,
      performanceScore: metrics.performanceScore,
    },
    ACTOR
  );
}

export const performanceTargetsSeed: PerformanceTarget[] = [
  makeTarget({
    id: "pt-001",
    title: "Weekly Sales Calls",
    description: "Complete 10 outbound calls this week",
    categoryId: "tcat-sales",
    typeId: "ttype-calls",
    templateId: "ttpl-sales-daily",
    quantity: 10,
    unit: "calls",
    completedQuantity: 3,
    startDate: "2026-08-03",
    endDate: "2026-08-10",
    priority: "high",
    weight: 1,
    assigneeScope: "employee",
    assigneeIds: ["emp-003"],
    department: "Design",
    branch: "Alexandria",
    roleKey: "",
    ownerId: ACTOR,
    status: "on_track",
    notes: "Focus on enterprise leads",
    expectedCompletion: "2026-08-10",
  }),
  makeTarget({
    id: "pt-002",
    title: "Bug Fix Sprint",
    description: "Close 8 high-priority bugs",
    categoryId: "tcat-dev",
    typeId: "ttype-bugs",
    templateId: null,
    quantity: 8,
    unit: "bugs",
    completedQuantity: 2,
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    priority: "critical",
    weight: 2,
    assigneeScope: "employee",
    assigneeIds: ["emp-002"],
    department: "Engineering",
    branch: "Cairo",
    roleKey: "",
    ownerId: ACTOR,
    status: "behind_schedule",
    notes: "",
    expectedCompletion: "2026-08-08",
  }),
  makeTarget({
    id: "pt-003",
    title: "Content Publishing",
    description: "Publish 6 marketing posts",
    categoryId: "tcat-mkt",
    typeId: "ttype-posts",
    templateId: null,
    quantity: 6,
    unit: "posts",
    completedQuantity: 6,
    startDate: "2026-07-20",
    endDate: "2026-08-05",
    priority: "medium",
    weight: 1,
    assigneeScope: "employee",
    assigneeIds: ["emp-004"],
    department: "Design",
    branch: "Cairo",
    roleKey: "",
    ownerId: ACTOR,
    status: "completed",
    notes: "",
    expectedCompletion: "2026-08-05",
  }),
  makeTarget({
    id: "pt-agent-sales",
    title: "Agent Demo — Daily Follow Ups",
    description: "Mock data from Target User Agent theater pack",
    categoryId: "tcat-sales",
    typeId: "ttype-followups",
    templateId: "ttpl-sales-daily",
    quantity: 5,
    unit: "follow-ups",
    completedQuantity: 1,
    startDate: "2026-08-04",
    endDate: "2026-08-09",
    priority: "medium",
    weight: 1,
    assigneeScope: "employee",
    assigneeIds: ["emp-014"],
    department: "Sales",
    branch: "Cairo",
    roleKey: "",
    ownerId: ACTOR,
    status: "in_progress",
    notes: "Seeded for UI demo — complete linked tasks to raise progress",
    expectedCompletion: "2026-08-09",
  }),
  makeTarget({
    id: "pt-agent-prs",
    title: "Agent Demo — Pull Requests",
    description: "Engineering delivery mock for dashboard charts",
    categoryId: "tcat-dev",
    typeId: "ttype-prs",
    templateId: null,
    quantity: 4,
    unit: "PRs",
    completedQuantity: 0,
    startDate: "2026-08-05",
    endDate: "2026-08-07",
    priority: "critical",
    weight: 2,
    assigneeScope: "employee",
    assigneeIds: ["emp-001"],
    department: "Engineering",
    branch: "Cairo",
    roleKey: "",
    ownerId: ACTOR,
    status: "delayed",
    notes: "Intentionally behind for Delayed Center demo",
    expectedCompletion: "2026-08-07",
  }),
  makeTarget({
    id: "pt-agent-meetings",
    title: "Agent Demo — Client Meetings",
    description: "Multi-assignee demo target",
    categoryId: "tcat-sales",
    typeId: "ttype-meetings",
    templateId: null,
    quantity: 3,
    unit: "meetings",
    completedQuantity: 2,
    startDate: "2026-08-02",
    endDate: "2026-08-12",
    priority: "high",
    weight: 1.5,
    assigneeScope: "multi",
    assigneeIds: ["emp-003", "emp-014"],
    department: "Sales",
    branch: "Alexandria",
    roleKey: "",
    ownerId: ACTOR,
    status: "on_track",
    notes: "Shared sales meetings pack",
    expectedCompletion: "2026-08-12",
  }),
];

export const targetWarningsSeed: TargetWarning[] = [
  enrichWithAudit(
    {
      id: "tw-001",
      targetId: "pt-002",
      employeeId: "emp-002",
      reason: "Progress behind expected pace with 2 days left",
      managerNotes: "Please prioritize critical bugs before new features",
      requiredAction: "Complete at least 3 bug fixes within 48 hours",
      penaltyType: "performance_note",
      penaltyNote: "Logged on performance file",
      acknowledgedAt: null,
      acknowledgedBy: null,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "tw-agent-001",
      targetId: "pt-agent-prs",
      employeeId: "emp-001",
      reason: "Agent Demo: critical PR target overdue with 0 completions",
      managerNotes: "Unblock reviews and ship at least 2 PRs today",
      requiredAction: "Merge 2 pull requests before EOD",
      penaltyType: "written_warning",
      penaltyNote: "Demo warning for Warning Center UI",
      acknowledgedAt: null,
      acknowledgedBy: null,
    },
    ACTOR
  ),
];
