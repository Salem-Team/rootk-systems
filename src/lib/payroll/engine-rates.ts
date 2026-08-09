import type { PayrollCalculationInput, PayrollPolicies } from "@/types/payroll";

export function roundAmount(
  value: number,
  mode: PayrollPolicies["autoRounding"]
): number {
  switch (mode) {
    case "nearest_1":
      return Math.round(value);
    case "nearest_5":
      return Math.round(value / 5) * 5;
    case "nearest_10":
      return Math.round(value / 10) * 10;
    default:
      return Math.round(value * 100) / 100;
  }
}

export function allowancesTotal(input: PayrollCalculationInput): number {
  const a = input.profile.allowances;
  return (
    a.housing + a.transportation + a.meal + a.phone + a.other + a.shift
  );
}

export function resolveRates(input: PayrollCalculationInput): {
  daily: number;
  hourly: number;
  hoursPerDay: number;
} {
  const base =
    input.profile.basicSalary +
    allowancesTotal(input) +
    input.profile.bonuses +
    input.profile.commission;
  const workingDays = Math.max(input.period.workingDays, 1);
  const minMinutes =
    input.schedule?.minimumWorkingMinutes ??
    input.policies.minimumWorkingMinutes;
  const hoursPerDay = Math.max(minMinutes / 60, 1);

  switch (input.profile.salaryType) {
    case "hourly":
      return {
        hourly: input.profile.basicSalary,
        daily: input.profile.basicSalary * hoursPerDay,
        hoursPerDay,
      };
    case "daily":
      return {
        daily: input.profile.basicSalary,
        hourly: input.profile.basicSalary / hoursPerDay,
        hoursPerDay,
      };
    case "weekly":
      return {
        daily: (input.profile.basicSalary * 4.33) / workingDays,
        hourly: (input.profile.basicSalary * 4.33) / workingDays / hoursPerDay,
        hoursPerDay,
      };
    case "monthly":
    default:
      return {
        daily: base / workingDays,
        hourly: base / workingDays / hoursPerDay,
        hoursPerDay,
      };
  }
}
