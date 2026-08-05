import { z } from "zod";

export const loginCredentialsSchema = z.object({
  email: z.string().trim().min(1, "required").email("invalid"),
  password: z.string().min(1, "required").min(6, "too_short"),
});

export type LoginCredentialsDto = z.infer<typeof loginCredentialsSchema>;
