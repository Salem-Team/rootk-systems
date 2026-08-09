import type {
  PayrollCalendarDay,
  PayrollRun,
  PayrollTimelineEvent,
} from "@/types/payroll";
import type { SeedOf } from "@/types/seed";
import { PAYROLL_PERIOD } from "./period-policies";

export const payrollRunSeed: SeedOf<PayrollRun> = {
  id: "run-2026-08",
  periodId: PAYROLL_PERIOD.id,
  status: "hr_review",
  employeeCount: 16,
  estimatedCost: 0,
  totalDeductions: 0,
  totalOvertime: 0,
  netPayroll: 0,
  averageSalary: 0,
  employerCostTotal: 0,
  pendingCount: 3,
  generatedAt: "2026-08-01T09:00:00+03:00",
};

export const payrollTimelineSeed: PayrollTimelineEvent[] = [
  {
    id: "tl-1",
    kind: "attendance",
    title: "Attendance locked",
    description: "July attendance closed for payroll input.",
    at: "2026-07-31T18:00:00+03:00",
  },
  {
    id: "tl-2",
    kind: "leave",
    title: "Leave sync",
    description: "Approved leave mapped to unpaid/paid fractions.",
    at: "2026-08-01T08:30:00+03:00",
  },
  {
    id: "tl-3",
    kind: "generated",
    title: "Payroll draft generated",
    description: "Engine produced August draft payslips.",
    at: "2026-08-01T09:00:00+03:00",
    status: "draft",
  },
  {
    id: "tl-4",
    kind: "bonus",
    title: "Incentives posted",
    description: "Performance incentives and commissions applied.",
    at: "2026-08-01T16:00:00+03:00",
    amount: 12500,
  },
  {
    id: "tl-5",
    kind: "adjustment",
    title: "HR adjustments",
    description: "Manual adjustments, loans, and penalties applied.",
    at: "2026-08-02T11:00:00+03:00",
    amount: 18500,
  },
  {
    id: "tl-6",
    kind: "approved",
    title: "Awaiting finance",
    description: "Moved to HR review → Finance queue.",
    at: "2026-08-02T14:00:00+03:00",
    status: "hr_review",
  },
  {
    id: "tl-7",
    kind: "paid",
    title: "Pay date",
    description: "Scheduled bank transfer window.",
    at: "2026-09-01T09:00:00+03:00",
    status: "paid",
  },
];

export const payrollCalendarSeed: PayrollCalendarDay[] = [
  { date: "2026-08-01", label: "Cycle start", kind: "normal" },
  { date: "2026-08-25", label: "Cutoff", kind: "cutoff" },
  { date: "2026-08-27", label: "HR review", kind: "review" },
  { date: "2026-08-29", label: "Finance review", kind: "review" },
  { date: "2026-09-01", label: "Pay day", kind: "pay" },
];
