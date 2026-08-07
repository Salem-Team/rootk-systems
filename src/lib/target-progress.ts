/**
 * Centralized target progress / health / risk calculations.
 * Progress MUST come from completed linked work — never manual %.
 */

export type TargetProgressStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "on_track"
  | "behind_schedule"
  | "delayed"
  | "completed"
  | "cancelled"
  | "archived";

export type TargetHealth =
  | "excellent"
  | "good"
  | "average"
  | "warning"
  | "critical"
  | "delayed";

export type TargetRiskLevel = "low" | "medium" | "high" | "critical";

export interface TargetProgressInput {
  quantity: number;
  completedQuantity: number;
  startDate: string;
  endDate: string;
  status?: TargetProgressStatus;
  /** Override "today" for deterministic tests / demo. */
  now?: Date;
}

export interface TargetProgressMetrics {
  completed: number;
  remaining: number;
  percentage: number;
  expectedProgress: number;
  actualProgress: number;
  variance: number;
  performanceScore: number;
  remainingDays: number;
  totalDays: number;
  elapsedDays: number;
  requiredDailyRate: number;
  completionForecast: string | null;
  trend: "ahead" | "on_track" | "behind" | "critical";
  riskLevel: TargetRiskLevel;
  health: TargetHealth;
  derivedStatus: TargetProgressStatus;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseDay(iso: string): Date {
  const day = iso.slice(0, 10);
  return new Date(`${day}T00:00:00.000Z`);
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeTargetProgress(
  input: TargetProgressInput
): TargetProgressMetrics {
  const quantity = Math.max(0, Math.floor(input.quantity));
  const completed = clamp(Math.floor(input.completedQuantity), 0, quantity || 0);
  const remaining = Math.max(0, quantity - completed);
  const percentage = quantity === 0 ? 0 : round1((completed / quantity) * 100);

  const start = parseDay(input.startDate);
  const end = parseDay(input.endDate);
  const now = input.now ?? new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const totalDays = Math.max(1, dayDiff(start, end) + 1);
  const rawElapsed = dayDiff(start, today) + 1;
  const elapsedDays = clamp(rawElapsed, 0, totalDays);
  const remainingDays = Math.max(0, dayDiff(today, end));

  const expectedProgress =
    quantity === 0
      ? 0
      : today < start
        ? 0
        : today > end
          ? 100
          : round1((elapsedDays / totalDays) * 100);

  const actualProgress = percentage;
  const variance = round1(actualProgress - expectedProgress);

  const daysLeftForRate = Math.max(1, remainingDays || (today > end ? 1 : remainingDays));
  const requiredDailyRate =
    remaining === 0 ? 0 : round1(remaining / daysLeftForRate);

  let completionForecast: string | null = null;
  if (completed > 0 && remaining > 0 && elapsedDays > 0) {
    const pace = completed / elapsedDays;
    if (pace > 0) {
      const daysNeeded = Math.ceil(remaining / pace);
      const forecast = new Date(today);
      forecast.setUTCDate(forecast.getUTCDate() + daysNeeded);
      completionForecast = forecast.toISOString().slice(0, 10);
    }
  } else if (remaining === 0 && quantity > 0) {
    completionForecast = today.toISOString().slice(0, 10);
  }

  const overdue = today > end && remaining > 0;
  let trend: TargetProgressMetrics["trend"] = "on_track";
  if (overdue || variance <= -30) trend = "critical";
  else if (variance <= -10) trend = "behind";
  else if (variance >= 10) trend = "ahead";

  let riskLevel: TargetRiskLevel = "low";
  if (overdue) riskLevel = "critical";
  else if (variance <= -25 || (remainingDays <= 1 && percentage < 90))
    riskLevel = "critical";
  else if (variance <= -15 || (remainingDays <= 3 && percentage < 70))
    riskLevel = "high";
  else if (variance <= -5 || remainingDays <= 7) riskLevel = "medium";

  let health: TargetHealth = "average";
  if (overdue) health = "delayed";
  else if (percentage >= 95 || variance >= 15) health = "excellent";
  else if (percentage >= 75 || variance >= 5) health = "good";
  else if (variance <= -20 || riskLevel === "critical") health = "critical";
  else if (variance <= -10 || riskLevel === "high") health = "warning";

  const performanceScore = round1(
    clamp(
      percentage * 0.55 +
        (100 + variance) * 0.25 +
        (riskLevel === "low" ? 20 : riskLevel === "medium" ? 10 : riskLevel === "high" ? 0 : -10) +
        (overdue ? -15 : 0),
      0,
      100
    )
  );

  let derivedStatus: TargetProgressStatus = input.status ?? "assigned";
  if (
    derivedStatus !== "draft" &&
    derivedStatus !== "cancelled" &&
    derivedStatus !== "archived"
  ) {
    if (remaining === 0 && quantity > 0) derivedStatus = "completed";
    else if (overdue) derivedStatus = "delayed";
    else if (completed === 0 && today >= start) derivedStatus = "assigned";
    else if (trend === "behind" || trend === "critical")
      derivedStatus = "behind_schedule";
    else if (completed > 0) derivedStatus = "on_track";
    else derivedStatus = "in_progress";
  }

  return {
    completed,
    remaining,
    percentage,
    expectedProgress,
    actualProgress,
    variance,
    performanceScore,
    remainingDays,
    totalDays,
    elapsedDays,
    requiredDailyRate,
    completionForecast,
    trend,
    riskLevel,
    health,
    derivedStatus,
  };
}

export function buildTaskTitle(
  template: string,
  name: string,
  index: number
): string {
  return template
    .replaceAll("{name}", name)
    .replaceAll("{n}", String(index))
    .trim();
}

/** Soft cap so a single assignment cannot flood the task board. */
export const MAX_AUTO_TASKS_PER_TARGET = 100;
