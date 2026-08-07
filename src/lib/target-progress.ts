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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function parseWindowInstant(iso: string, boundary: "start" | "end"): Date {
  const raw = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return boundary === "end"
      ? new Date(`${raw}T23:59:59.999`)
      : new Date(`${raw}T00:00:00.000`);
  }
  const d = new Date(raw.includes("T") && raw.length === 16 ? `${raw}:00` : raw);
  if (Number.isNaN(d.getTime())) {
    return parseDay(raw);
  }
  return d;
}

export function computeTargetProgress(
  input: TargetProgressInput
): TargetProgressMetrics {
  const quantity = Math.max(0, Math.floor(input.quantity));
  const completed = clamp(Math.floor(input.completedQuantity), 0, quantity || 0);
  const remaining = Math.max(0, quantity - completed);
  const percentage = quantity === 0 ? 0 : round1((completed / quantity) * 100);

  const start = parseWindowInstant(input.startDate, "start");
  let end = parseWindowInstant(input.endDate, "end");
  // Same instant is valid; keep a 1ms window so rates stay defined.
  if (end.getTime() < start.getTime()) end = new Date(start.getTime());
  const now = input.now ?? new Date();

  const totalMs = Math.max(1, end.getTime() - start.getTime());
  const elapsedMs = clamp(now.getTime() - start.getTime(), 0, totalMs);
  const remainingMs = Math.max(0, end.getTime() - now.getTime());

  const MS_DAY = 86_400_000;
  const totalDays = Math.max(1, round1(totalMs / MS_DAY));
  const elapsedDays = round1(elapsedMs / MS_DAY);
  const remainingDays = round1(remainingMs / MS_DAY);

  const expectedProgress =
    quantity === 0
      ? 0
      : now < start
        ? 0
        : now > end
          ? 100
          : round1((elapsedMs / totalMs) * 100);

  const actualProgress = percentage;
  const variance = round1(actualProgress - expectedProgress);

  const daysLeftForRate = Math.max(
    totalMs < MS_DAY ? Math.max(totalMs / MS_DAY, 1 / 24) : 1,
    remainingDays || (now > end ? 1 : remainingDays)
  );
  const requiredDailyRate =
    remaining === 0 ? 0 : round1(remaining / daysLeftForRate);

  let completionForecast: string | null = null;
  if (completed > 0 && remaining > 0 && elapsedMs > 0) {
    const pacePerMs = completed / elapsedMs;
    if (pacePerMs > 0) {
      const msNeeded = remaining / pacePerMs;
      const forecast = new Date(now.getTime() + msNeeded);
      completionForecast = forecast.toISOString();
    }
  } else if (remaining === 0 && quantity > 0) {
    completionForecast = now.toISOString();
  }

  const overdue = now > end && remaining > 0;
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
    else if (completed === 0 && now >= start) derivedStatus = "assigned";
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
