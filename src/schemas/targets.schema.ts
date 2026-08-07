import { z } from "zod";

export const targetStatusSchema = z.enum([
  "draft",
  "assigned",
  "in_progress",
  "on_track",
  "behind_schedule",
  "delayed",
  "completed",
  "cancelled",
  "archived",
]);

export const targetPrioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const targetAssigneeScopeSchema = z.enum([
  "employee",
  "department",
  "role",
  "team",
  "branch",
  "multi",
]);

export const targetPenaltyTypeSchema = z.enum([
  "written_warning",
  "salary_deduction",
  "performance_note",
  "bonus_reduction",
  "manager_review",
  "custom",
]);

export const targetCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().trim().min(4).max(32).default("#082868"),
  icon: z.string().trim().min(1).max(48).default("Target"),
  description: z.string().max(500).default(""),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  id: z.string().optional(),
});

export const targetTypeSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).default(""),
  unit: z.string().trim().min(1).max(40).default("unit"),
  taskTitleTemplate: z.string().trim().min(1).max(120).default("{name} #{n}"),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  id: z.string().optional(),
});

export const targetTemplateItemSchema = z.object({
  typeId: z.string().min(1),
  quantity: z.number().int().min(1).max(1000),
  unit: z.string().trim().min(1).max(40).default("unit"),
  weight: z.number().min(0).max(100).default(1),
  sortOrder: z.number().int().min(0).default(0),
  id: z.string().optional(),
});

export const targetTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).default(""),
  categoryId: z.string().nullable().optional(),
  active: z.boolean().default(true),
  items: z.array(targetTemplateItemSchema).min(1).max(40),
  id: z.string().optional(),
});

export const assignTargetSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(2000).default(""),
    categoryId: z.string().min(1),
    typeId: z.string().min(1),
    templateId: z.string().nullable().optional(),
    quantity: z.number().int().min(1).max(1000),
    unit: z.string().trim().min(1).max(40).default("unit"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    priority: targetPrioritySchema.default("medium"),
    weight: z.number().min(0).max(100).default(1),
    assigneeScope: targetAssigneeScopeSchema.default("employee"),
    assigneeIds: z.array(z.string().min(1)).min(1).max(200),
    department: z.string().max(120).default(""),
    branch: z.string().max(120).default(""),
    roleKey: z.string().max(40).default(""),
    ownerId: z.string().max(80).default(""),
    notes: z.string().max(2000).default(""),
    expectedCompletion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    status: targetStatusSchema.default("assigned"),
    generateTasks: z.boolean().default(true),
    id: z.string().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

export const targetWarningSchema = z.object({
  targetId: z.string().min(1),
  employeeId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
  managerNotes: z.string().max(2000).default(""),
  requiredAction: z.string().max(1000).default(""),
  penaltyType: targetPenaltyTypeSchema.default("written_warning"),
  penaltyNote: z.string().max(1000).default(""),
});

export type TargetCategoryInput = z.infer<typeof targetCategorySchema>;
export type TargetTypeInput = z.infer<typeof targetTypeSchema>;
export type TargetTemplateInput = z.infer<typeof targetTemplateSchema>;
export type AssignTargetInput = z.infer<typeof assignTargetSchema>;
export type TargetWarningInput = z.infer<typeof targetWarningSchema>;
