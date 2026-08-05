import { z } from "zod";

export const dayOfWeekSchema = z.enum([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

export const updateWorkScheduleSchema = z.object({
  workingDays: z.array(dayOfWeekSchema).min(1).optional(),
  weekendDays: z.array(dayOfWeekSchema).optional(),
  wfhDays: z.array(dayOfWeekSchema).optional(),
  fromTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  toTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  gracePeriodMinutes: z.number().int().min(0).max(180).optional(),
  breakMinutes: z.number().int().min(0).max(240).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createHolidaySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["holiday", "event"]),
  description: z.string().trim().max(1000).optional(),
});

export type UpdateWorkScheduleDto = z.infer<typeof updateWorkScheduleSchema>;
export type CreateHolidayDto = z.infer<typeof createHolidaySchema>;
