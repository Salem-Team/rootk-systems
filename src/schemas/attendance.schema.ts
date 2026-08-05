import { z } from "zod";

export const checkInSchema = z.object({
  employeeId: z.string().min(1).optional(),
  wfh: z.boolean().optional(),
  note: z.string().trim().max(500).optional(),
});

export const checkOutSchema = z.object({
  employeeId: z.string().min(1).optional(),
});

export type CheckInDto = z.infer<typeof checkInSchema>;
export type CheckOutDto = z.infer<typeof checkOutSchema>;
