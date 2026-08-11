import { z } from "zod";

const hm = z
  .string()
  .trim()
  .transform((value): string => {
    const match = /^(\d{1,2}):([0-5]\d)/.exec(value);
    if (!match) return value;
    const hours = Number(match[1]);
    if (hours > 23) return value;
    return `${String(hours).padStart(2, "0")}:${match[2]}`;
  })
  .refine((value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
    message: "Invalid time",
  });

export const dailyPlanSlotInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().default(""),
  startTime: hm,
  endTime: hm,
});

export const saveDailyPlanSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  slots: z.array(dailyPlanSlotInputSchema).max(24),
});

export type DailyPlanSlotInputDto = z.infer<typeof dailyPlanSlotInputSchema>;
export type SaveDailyPlanDto = z.infer<typeof saveDailyPlanSchema>;
