import { z } from "zod";

export const createOrganicAdSchema = z.object({
  url: z
    .string()
    .trim()
    .min(8, "Paste a valid advertisement link")
    .max(2000),
  project: z.string().trim().max(120).optional().default(""),
  campaign: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  forceDuplicate: z.boolean().optional().default(false),
  workTaskId: z.string().trim().optional(),
  targetId: z.string().trim().optional(),
  linkToOpenTask: z.boolean().optional().default(true),
});

export const updateOrganicAdSchema = z.object({
  project: z.string().trim().max(120).optional(),
  campaign: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z
    .enum(["active", "inactive", "needs_review", "duplicate"])
    .optional(),
});

export const organicAdsSettingsSchema = z.object({
  weeklyTarget: z.number().int().min(0).max(50),
  allowDuplicateOverride: z.boolean(),
});

export type CreateOrganicAdSchemaInput = z.input<typeof createOrganicAdSchema>;
export type UpdateOrganicAdSchemaInput = z.infer<typeof updateOrganicAdSchema>;
export type OrganicAdsSettingsInput = z.infer<typeof organicAdsSettingsSchema>;
