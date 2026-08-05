import { z } from "zod";

export const employeeStatusSchema = z.enum(["active", "inactive", "on_leave"]);

export const departmentSchema = z.enum([
  "Engineering",
  "Design",
  "Product",
  "HR",
  "Finance",
  "Marketing",
  "Operations",
  "Sales",
]);

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
  employeeId: z.string().min(2).max(40).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  version: z.number().int().positive().optional(),
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
