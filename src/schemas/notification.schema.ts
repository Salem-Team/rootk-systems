import { z } from "zod";

export const notificationAudienceSchema = z.enum(["all", "admin", "employee"]);
export const notificationCategorySchema = z.enum([
  "leave",
  "attendance",
  "work",
  "payroll",
  "schedule",
  "announcement",
  "system",
  "mention",
]);
export const notificationPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);

export const createNotificationSchema = z.object({
  titleKey: z.string().min(1),
  bodyKey: z.string().min(1),
  vars: z.record(z.union([z.string(), z.number()])).optional(),
  category: notificationCategorySchema,
  priority: notificationPrioritySchema.default("normal"),
  audience: notificationAudienceSchema,
  recipientIds: z.array(z.string().min(1)).optional(),
  href: z.string().min(1).optional(),
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
