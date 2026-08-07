import { z } from "zod";

const money = z.coerce.number().min(0).max(10_000_000);

export const salaryAllowancesSchema = z.object({
  housing: money.default(0),
  transportation: money.default(0),
  meal: money.default(0),
  phone: money.default(0),
  other: money.default(0),
  shift: money.default(0),
});

export const salaryDeductionsSchema = z.object({
  insurance: money.default(0),
  tax: money.default(0),
  loan: money.default(0),
  advances: money.default(0),
  recurring: money.default(0),
  penalties: money.default(0),
});

export const updateSalaryProfileSchema = z.object({
  basicSalary: money,
  allowances: salaryAllowancesSchema,
  bonuses: money.default(0),
  commission: money.default(0),
  incentives: money.default(0),
  manualAdjustments: money.default(0),
  deductions: salaryDeductionsSchema,
  salaryGrade: z.enum(["G1", "G2", "G3", "G4", "G5", "G6", "G7"]).default("G3"),
  salaryType: z
    .enum(["monthly", "weekly", "daily", "hourly"])
    .default("monthly"),
  payrollGroup: z
    .enum(["standard", "executive", "shift", "contract"])
    .default("standard"),
  currency: z.string().trim().min(3).max(8).default("EGP"),
  bankAccount: z.string().trim().max(64).default(""),
  iban: z.string().trim().max(64).default(""),
  paymentMethod: z
    .enum(["bank_transfer", "cash", "cheque"])
    .default("bank_transfer"),
  insuranceStatus: z
    .enum(["insured", "exempt", "pending"])
    .default("insured"),
  taxStatus: z.enum(["resident", "non_resident", "exempt"]).default("resident"),
  contractType: z
    .enum(["full_time", "part_time", "contract", "intern"])
    .default("full_time"),
  historyNote: z.string().trim().max(200).optional(),
});

export type UpdateSalaryProfileInput = z.infer<typeof updateSalaryProfileSchema>;
