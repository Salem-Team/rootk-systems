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

export const employeeWorkScheduleSchema = z
  .object({
    workingDays: z.array(dayOfWeekSchema).min(1),
    weekendDays: z.array(dayOfWeekSchema),
    wfhDays: z.array(dayOfWeekSchema),
    fromTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    toTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    gracePeriodMinutes: z.number().int().min(0).max(180),
    breakMinutes: z.number().int().min(0).max(240),
  })
  .refine(
    (value) => value.wfhDays.every((day) => value.workingDays.includes(day)),
    { message: "WFH days must be working days" }
  )
  .refine((value) => value.toTime > value.fromTime, {
    message: "End time must be after start time",
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
