import { z } from "zod";

export const notificationsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
  sound: z.boolean(),
  attendanceReminders: z.boolean(),
  leaveUpdates: z.boolean(),
  announcements: z.boolean(),
  system: z.boolean(),
  work: z.boolean(),
  payroll: z.boolean(),
  schedule: z.boolean(),
  mention: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  quietAllowUrgent: z.boolean(),
  retentionDays: z.number().int().min(0).max(3650),
});

export const updateSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  legalName: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  address: z.string().trim().min(3).max(400).optional(),
  website: z.union([z.string().url(), z.literal("")]).optional(),
  timezone: z.string().min(1).optional(),
  currency: z.string().min(3).max(3).optional(),
  language: z.enum(["en", "ar"]).optional(),
  appearance: z.enum(["system", "light", "dark"]).optional(),
  notifications: notificationsSchema.partial().optional(),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
