import { z } from "zod";

export const punchLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
});

export const checkInSchema = z.object({
  employeeId: z.string().min(1).optional(),
  wfh: z.boolean().optional(),
  note: z.string().trim().max(500).optional(),
  location: punchLocationSchema.optional(),
});

export const checkOutSchema = z.object({
  employeeId: z.string().min(1).optional(),
  location: punchLocationSchema.optional(),
});

export type PunchLocationDto = z.infer<typeof punchLocationSchema>;
export type CheckInDto = z.infer<typeof checkInSchema>;
export type CheckOutDto = z.infer<typeof checkOutSchema>;
