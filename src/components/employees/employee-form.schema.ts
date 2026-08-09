import { z } from "zod";
import {
  departmentSchema,
  employeeStatusSchema,
} from "@/schemas/employee.schema";
import { demoTodayKey } from "@/lib/mock-date";
import type { Employee } from "@/types";

export const LOCATIONS = [
  "Cairo",
  "New Cairo",
  "Giza",
  "Alexandria",
  "Mansoura",
  "Remote",
] as const;
export const NONE_MANAGER = "__none__";

export const employeeFormSchema = z
  .object({
    name: z.string().trim().min(2, "name"),
    email: z.string().trim().email("email"),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    department: departmentSchema,
    position: z.string().trim().min(2, "position"),
    location: z.string().trim().min(1).max(120),
    joinDate: z.string().min(4),
    status: employeeStatusSchema,
    manager: z.string().trim().max(120).optional().or(z.literal("")),
    employeeId: z.string().trim().max(40).optional().or(z.literal("")),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const password = data.password?.trim() ?? "";
    const confirm = data.confirmPassword?.trim() ?? "";
    if (password.length > 0 && password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password_short",
        path: ["password"],
      });
    }
    if (password !== confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password_mismatch",
        path: ["confirmPassword"],
      });
    }
  });

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export function emptyValues(): EmployeeFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    department: "Engineering",
    position: "",
    location: "Cairo",
    joinDate: demoTodayKey(),
    status: "active",
    manager: "",
    employeeId: "",
    password: "",
    confirmPassword: "",
  };
}

export function fromEmployee(employee: Employee): EmployeeFormValues {
  return {
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    department: employee.department,
    position: employee.position,
    location: employee.location,
    joinDate: employee.joinDate,
    status: employee.status,
    manager: employee.manager ?? "",
    employeeId: employee.employeeId,
    password: "",
    confirmPassword: "",
  };
}

export function suggestEmployeeCode(used: Set<string>) {
  for (let i = 0; i < 40; i += 1) {
    const code = `RK-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!used.has(code.toLowerCase())) return code;
  }
  return `RK-${Date.now().toString().slice(-4)}`;
}
