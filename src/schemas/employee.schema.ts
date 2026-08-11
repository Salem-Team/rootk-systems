import { z } from "zod";

export const employeeStatusSchema = z.enum(["active", "inactive", "on_leave"]);

export const departmentSchema = z.string().trim().min(1).max(120);

export const updateEmployeeStatusSchema = z.object({
  status: employeeStatusSchema,
});

export const createEmployeeSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  department: departmentSchema,
  position: z.string().min(2).max(120),
  location: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional(),
  joinDate: z.string().min(4),
  status: employeeStatusSchema.optional(),
  manager: z.string().max(120).optional(),
  managerEmployeeId: z.string().max(64).optional(),
  employeeId: z.string().min(2).max(40).optional(),
  /** Initial login password set by admin. */
  password: z.string().min(6).max(128),
});

export const updateEmployeeSchema = createEmployeeSchema
  .omit({ password: true })
  .partial()
  .extend({
    version: z.number().int().positive().optional(),
    /** Optional admin password reset. */
    password: z.string().min(6).max(128).optional(),
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(128),
  newPassword: z.string().min(6).max(128),
});

export const employeeFiltersSchema = z.object({
  query: z.string().optional(),
  department: departmentSchema.optional(),
  status: employeeStatusSchema.optional(),
  location: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  cursor: z.string().optional(),
});

export type UpdateEmployeeStatusDto = z.infer<typeof updateEmployeeStatusSchema>;
export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
