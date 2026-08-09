import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "completed"]);
export const taskPrioritySchema = z.enum(["high", "medium", "low"]);
export const workOriginSchema = z.enum(["assigned", "personal"]);

const optionalDueDateSchema = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      /^\d{4}-\d{2}-\d{2}$/.test(v) ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ||
      !Number.isNaN(Date.parse(v)),
    "Invalid date/time"
  )
  .optional()
  .default("");

const evidenceUrlSchema = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  })
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    { message: "Invalid evidence URL" }
  );

export const taskEvidenceSchema = z.object({
  links: z.array(evidenceUrlSchema).max(10).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const updateWorkTaskStatusSchema = z.object({
  status: taskStatusSchema,
  evidence: taskEvidenceSchema.optional(),
});

export const createWorkTaskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000).default(""),
  status: taskStatusSchema.default("todo"),
  priority: taskPrioritySchema.default("medium"),
  /** Optional — empty string means no due date. */
  dueDate: optionalDueDateSchema,
  tag: z.string().trim().max(80).default(""),
  /** Optional — 0 means no time estimate. */
  estimateMin: z.number().int().min(0).max(480).optional().default(0),
  assigneeIds: z.array(z.string().min(1)).min(1),
  relatedMeetingId: z.string().min(1).optional(),
  origin: workOriginSchema.default("assigned"),
  requireEvidenceLinks: z.boolean().optional(),
  requireEvidenceNotes: z.boolean().optional(),
  evidenceLinks: z.array(evidenceUrlSchema).max(10).optional(),
  evidenceNotes: z.string().trim().max(4000).optional(),
  subItems: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1).max(200),
        done: z.boolean().optional(),
      })
    )
    .default([]),
});

export const updateWorkTaskSchema = createWorkTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
  assignedAt: z.string().optional(),
  completedAt: z.string().nullable().optional(),
});

const optionalJoinUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  })
  .refine((value) => value === "" || z.string().url().safeParse(value).success, {
    message: "Invalid meeting URL",
  });

export const createWorkMeetingBaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  location: z.string().trim().min(1).max(200),
  organizerId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1),
  agenda: z.array(z.string().trim().min(1).max(300)).default([]),
  notes: z.string().trim().max(4000).default(""),
  joinUrl: optionalJoinUrlSchema,
  origin: workOriginSchema.default("assigned"),
});

export const createWorkMeetingSchema = createWorkMeetingBaseSchema.refine(
  (v) => v.endTime > v.startTime,
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

export const updateWorkMeetingSchema = createWorkMeetingBaseSchema
  .partial()
  .superRefine((v, ctx) => {
    if (v.startTime && v.endTime && v.endTime <= v.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

export type CreateWorkTaskDto = z.infer<typeof createWorkTaskSchema>;
export type UpdateWorkTaskDto = z.infer<typeof updateWorkTaskSchema>;
export type UpdateWorkTaskStatusDto = z.infer<typeof updateWorkTaskStatusSchema>;
export type TaskEvidenceDto = z.infer<typeof taskEvidenceSchema>;
export type CreateWorkMeetingDto = z.infer<typeof createWorkMeetingSchema>;
export type UpdateWorkMeetingDto = z.infer<typeof updateWorkMeetingSchema>;
