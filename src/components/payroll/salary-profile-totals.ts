import type { EmployeeSalaryProfile } from "@/types/payroll";

export function sumAllowances(profile: EmployeeSalaryProfile): number {
  const a = profile.allowances;
  return a.housing + a.transportation + a.meal + a.phone + a.shift + a.other;
}

export function sumDeductions(profile: EmployeeSalaryProfile): number {
  const d = profile.deductions;
  return d.insurance + d.tax + d.loan + d.advances + d.recurring + d.penalties;
}

/** Contract preview from saved profile (before attendance/leave run impacts). */
export function contractTotals(profile: EmployeeSalaryProfile) {
  const allowancesTotal = sumAllowances(profile);
  const gross =
    profile.basicSalary +
    allowancesTotal +
    profile.bonuses +
    profile.commission +
    profile.incentives +
    profile.manualAdjustments;
  const deductionsTotal = sumDeductions(profile);
  const net = gross - deductionsTotal;
  return { allowancesTotal, gross, deductionsTotal, net };
}
