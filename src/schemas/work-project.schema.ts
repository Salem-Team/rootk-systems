import { z } from "zod";
import { taskPrioritySchema, taskStatusSchema } from "@/schemas/work.schema";

const dateField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Invalid date");

export const workProjectTaskSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(""),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: dateField.default(""),
  estimateMin: z.number().int().min(0).max(100000).default(0),
  assigneeIds: z.array(z.string()).max(20).default([]),
});

export const workProjectPhaseSchema = z
  .object({
    id: z.string().min(1).max(40),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(""),
    status: z.enum(["upcoming", "active", "done"]),
    startDate: dateField.default(""),
    endDate: dateField.default(""),
    tasks: z.array(workProjectTaskSchema).max(40).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Phase end date is before the start date",
      });
    }
  });

export const workProjectBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(4000).default(""),
    status: z.enum(["planning", "active", "on_hold", "completed"]),
    startDate: dateField.default(""),
    endDate: dateField.default(""),
    leadId: z.string().trim().min(1).max(80),
    memberIds: z.array(z.string()).min(1).max(80),
    phases: z.array(workProjectPhaseSchema).max(24).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date is before the start date",
      });
    }
    if (!value.memberIds.includes(value.leadId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["memberIds"],
        message: "The lead must be on the project team",
      });
    }
  });

export type WorkProjectBody = z.infer<typeof workProjectBodySchema>;
