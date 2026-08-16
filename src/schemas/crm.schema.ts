import { z } from "zod";

const leadSource = z.enum([
  "facebook",
  "instagram",
  "tiktok",
  "website",
  "whatsapp",
  "referral",
  "organic",
  "advertisement",
  "other",
]);

const leadStatus = z.enum(["active", "inactive", "archived"]);

const nextAction = z.enum([
  "call",
  "whatsapp",
  "email",
  "meeting",
  "follow_up",
  "send_proposal",
  "none",
]);

const stageCategory = z.enum(["open", "won", "lost", "other"]);

const leadTag = z.enum([
  "hot",
  "warm",
  "cold",
  "vip",
  "high_budget",
  "follow_up",
  "interested",
]);

const activityType = z.enum([
  "call",
  "whatsapp",
  "email",
  "meeting",
  "note",
  "stage_change",
  "assignment",
  "feedback",
  "follow_up",
  "status_change",
  "created",
  "other",
]);

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Contact is required"),
  contactKind: z
    .enum([
      "phone",
      "whatsapp",
      "instagram",
      "telegram",
      "facebook",
      "tiktok",
      "linkedin",
      "other",
    ])
    .optional(),
  contacts: z
    .array(
      z.object({
        kind: z
          .enum([
            "phone",
            "whatsapp",
            "instagram",
            "telegram",
            "facebook",
            "tiktok",
            "linkedin",
            "other",
          ])
          .optional(),
        phone: z.string().trim().min(1),
      })
    )
    .max(8)
    .optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  companyName: z.string().trim().optional().default(""),
  businessTypeId: z.string().nullable().optional(),
  source: leadSource.default("other"),
  ownerEmployeeId: z.string().nullable().optional(),
  stageId: z.string().min(1, "Stage is required"),
  subStageId: z.string().nullable().optional(),
  status: leadStatus.default("active"),
  tags: z.array(leadTag).default([]),
  nextAction: nextAction.default("none"),
  nextFollowUpAt: z.string().nullable().optional(),
  notes: z.string().optional().default(""),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  lossReasonTypeId: z.string().nullable().optional(),
  convertedAt: z.string().nullable().optional(),
  lastActivityAt: z.string().nullable().optional(),
});

export const stageSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Stage name is required"),
  description: z.string().optional().default(""),
  color: z.string().min(1).default("#64748b"),
  sortOrder: z.number().int().optional(),
  active: z.boolean().default(true),
  conversionProbability: z.number().int().min(0).max(100).nullable().optional(),
  category: stageCategory.default("open"),
});

export const subStageSchema = z.object({
  id: z.string().optional(),
  stageId: z.string().min(1, "Stage is required"),
  name: z.string().trim().min(1, "Sub-stage name is required"),
  description: z.string().optional().default(""),
  sortOrder: z.number().int().optional(),
  active: z.boolean().default(true),
});

export const feedbackTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional().default(""),
  sortOrder: z.number().int().optional(),
  active: z.boolean().default(true),
  isLossReason: z.boolean().default(false),
});

export const businessTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Business type name is required"),
  description: z.string().optional().default(""),
  sortOrder: z.number().int().optional(),
  active: z.boolean().default(true),
});

export const leadActivitySchema = z.object({
  type: activityType,
  title: z.string().trim().min(1),
  description: z.string().optional().default(""),
  occurredAt: z.string().optional(),
});

export const leadFeedbackSchema = z.object({
  feedbackTypeId: z.string().optional(),
  customerFeedback: z.string().optional().default(""),
  callAnswered: z.boolean().default(true),
  stageId: z.string().optional(),
  tags: z.array(leadTag).optional(),
  nextAction: nextAction.optional().default("follow_up"),
  nextFollowUpAt: z.string().nullable().optional(),
  meetingMode: z.enum(["online", "offline"]).nullable().optional(),
  meetingLocation: z
    .enum(["our_company", "client_company"])
    .nullable()
    .optional(),
  notes: z.string().optional().default(""),
  mentionedUserIds: z.array(z.string().min(1)).max(20).optional(),
});

export const bulkLeadsSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum([
    "assign",
    "change_stage",
    "change_status",
    "archive",
    "delete",
  ]),
  value: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type StageInput = z.infer<typeof stageSchema>;
export type SubStageInput = z.infer<typeof subStageSchema>;
export type FeedbackTypeInput = z.infer<typeof feedbackTypeSchema>;
export type BusinessTypeInput = z.infer<typeof businessTypeSchema>;
export type LeadActivityInput = z.infer<typeof leadActivitySchema>;
export type LeadFeedbackInput = z.infer<typeof leadFeedbackSchema>;
export type BulkLeadsInput = z.infer<typeof bulkLeadsSchema>;
export const leadCallSchema = z.object({
  status: z.enum(["answered", "missed", "rejected", "failed", "unknown"]),
  direction: z.enum(["incoming", "outgoing"]).optional().default("outgoing"),
  source: z.enum(["manual", "web", "android", "ios"]).optional().default("web"),
  externalCallId: z.string().trim().min(1).optional(),
  phoneNumber: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().nullable().optional(),
  durationSeconds: z.number().int().min(0).max(86400).nullable().optional(),
  notes: z.string().optional().default(""),
  nextAction: nextAction.optional(),
  nextFollowUpAt: z.string().nullable().optional(),
});

export type LeadCallInput = z.infer<typeof leadCallSchema>;
