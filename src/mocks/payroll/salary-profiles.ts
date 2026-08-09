import type { EmployeeSalaryProfile } from "@/types/payroll";
import type { SeedOf } from "@/types/seed";
import { profile } from "./profile-helpers";

/** Salary profiles for the 16-employee demo roster. */
export const salaryProfilesSeed: SeedOf<EmployeeSalaryProfile>[] = [
  profile("emp-001", 28000, "G5", { bonuses: 1500, incentives: 500 }),
  profile("emp-002", 42000, "G7", {
    bonuses: 3000,
    payrollGroup: "executive",
    joiningDate: "2019-06-15",
  }),
  profile("emp-003", 22000, "G4"),
  profile("emp-004", 25000, "G4", { commission: 2000 }),
  profile("emp-005", 18000, "G3", {
    salaryType: "daily",
    contractType: "part_time",
  }),
  profile("emp-006", 32000, "G6", {
    payrollGroup: "shift",
    allowances: {
      housing: 8000,
      transportation: 1200,
      meal: 800,
      phone: 400,
      other: 300,
      shift: 400,
    },
  }),
  profile("emp-007", 19500, "G3"),
  profile("emp-008", 27000, "G5", {
    deductions: {
      insurance: 2970,
      tax: 2160,
      loan: 2000,
      advances: 500,
      recurring: 150,
      penalties: 200,
    },
    manualAdjustments: 300,
  }),
  profile("emp-009", 21000, "G4"),
  profile("emp-010", 35000, "G6", { bonuses: 2500, incentives: 1000 }),
  profile("emp-011", 16000, "G2", {
    contractType: "intern",
    insuranceStatus: "pending",
  }),
  profile("emp-012", 24000, "G4"),
  profile("emp-013", 30000, "G5", {
    payrollGroup: "shift",
    allowances: {
      housing: 7500,
      transportation: 1200,
      meal: 800,
      phone: 400,
      other: 300,
      shift: 350,
    },
  }),
  profile("emp-014", 17000, "G2"),
  profile("emp-015", 26000, "G5", { commission: 1500 }),
  profile("emp-016", 85, "G3", {
    salaryType: "hourly",
    contractType: "contract",
    payrollGroup: "contract",
  }),
];
