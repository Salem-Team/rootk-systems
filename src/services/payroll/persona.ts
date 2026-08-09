import { AppRole } from "@/constants/roles";
import type { PayrollPersona } from "@/types/payroll";

/** Role → payroll persona for UI visibility (demo mapping). */
export function personaForRole(
  role: "admin" | "employee",
  preferred?: PayrollPersona
): PayrollPersona {
  if (role === AppRole.employee) return "employee";
  return preferred ?? "admin";
}

export function canViewAllPayroll(persona: PayrollPersona): boolean {
  return persona === "admin" || persona === "hr" || persona === "finance";
}

export function canEditPolicies(persona: PayrollPersona): boolean {
  return persona === "admin" || persona === "hr";
}

export function canApproveFinance(persona: PayrollPersona): boolean {
  return persona === "admin" || persona === "finance";
}
