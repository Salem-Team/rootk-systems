import { z } from "zod";

export const leaveTypeSchema = z.enum([
  "annual",
  "sick",
  "personal",
  "unpaid",
  "maternity",
  "emergency",
]);

export const createLeaveSchema = z
  .object({
    employeeId: z.string().min(1).optional(),
    type: leaveTypeSchema,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date"),
    days: z.number().int().positive().max(365),
    reason: z.string().trim().min(3).max(2000),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const reviewLeaveSchema = z.object({
  reviewerNote: z.string().trim().max(2000).optional(),
});

export type CreateLeaveDto = z.infer<typeof createLeaveSchema>;
export type ReviewLeaveDto = z.infer<typeof reviewLeaveSchema>;
