import type { BaseEntity } from "@/types";
import type { PayrollRunStatus, PayrollTimelineKind } from "./enums";
import type { PayrollPeriod } from "./policies";

export interface PayrollRun extends BaseEntity {
  id: string;
  periodId: string;
  status: PayrollRunStatus;
  employeeCount: number;
  estimatedCost: number;
  totalDeductions: number;
  totalOvertime: number;
  netPayroll: number;
  averageSalary: number;
  employerCostTotal: number;
  pendingCount: number;
  generatedAt?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface PayrollTimelineEvent {
  id: string;
  kind: PayrollTimelineKind;
  title: string;
  description: string;
  at: string;
  amount?: number;
  status?: PayrollRunStatus;
}

export interface PayrollCalendarDay {
  date: string;
  label: string;
  kind: "cutoff" | "review" | "pay" | "holiday" | "normal";
}

export interface PayrollDashboardSummary {
  period: PayrollPeriod;
  run: PayrollRun;
  upcomingPayDate: string;
  employeesIncluded: number;
  pendingPayroll: number;
  estimatedCost: number;
  totalDeductions: number;
  totalOvertime: number;
  netPayroll: number;
  averageSalary: number;
  employeesProcessed: number;
  timeline: PayrollTimelineEvent[];
  calendar: PayrollCalendarDay[];
}
