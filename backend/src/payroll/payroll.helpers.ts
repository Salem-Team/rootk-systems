export const RUN_STEPS = [
  "draft",
  "hr_review",
  "finance_review",
  "approved",
  "paid",
] as const;

export type RunStep = (typeof RUN_STEPS)[number];

export function normalizeRunStatus(raw: string | null | undefined): RunStep {
  const v = (raw ?? "draft").toLowerCase();
  if (v === "calculated") return "hr_review";
  if ((RUN_STEPS as readonly string[]).includes(v)) return v as RunStep;
  return "draft";
}

export function nextRunStatus(current: RunStep): RunStep {
  const idx = RUN_STEPS.indexOf(current);
  if (idx < 0) return "hr_review";
  if (idx >= RUN_STEPS.length - 1) return "paid";
  return RUN_STEPS[idx + 1];
}

export function roundMoney(value: number, mode?: string): number {
  switch (mode) {
    case "nearest_5":
      return Math.round(value / 5) * 5;
    case "nearest_10":
      return Math.round(value / 10) * 10;
    case "none":
      return Math.round(value * 100) / 100;
    default:
      return Math.round(value);
  }
}

/** Full employee deductions (statutory + attendance + leave), with legacy fallbacks. */
export function slipDeductionsTotal(
  p: Record<string, number | undefined | null>
): number {
  if (typeof p.deductionsTotal === "number" && Number.isFinite(p.deductionsTotal)) {
    return p.deductionsTotal;
  }
  return (
    Number(p.attendanceDeductions ?? p.attendanceDeduction ?? 0) +
    Number(p.leaveDeductions ?? 0) +
    Number(p.insurance ?? 0) +
    Number(p.tax ?? 0) +
    Number(p.loans ?? p.loan ?? 0) +
    Number(p.advances ?? 0) +
    Number(p.penalties ?? 0) +
    Number(p.recurring ?? 0)
  );
}

export function periodBounds(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const periodId = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${periodId}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${periodId}-${String(lastDay).padStart(2, "0")}`;
  const payDate = `${periodId}-${String(Math.min(28, lastDay)).padStart(2, "0")}`;
  return {
    periodId,
    year,
    month,
    startDate,
    endDate,
    payDate,
    workingDays: 22,
    label: periodId,
  };
}

export type PeriodBounds = ReturnType<typeof periodBounds>;
