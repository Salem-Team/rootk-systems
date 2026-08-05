import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { ApiResponse } from "@/types";

export type HealthStatus = {
  status: "ok" | "degraded" | "down";
  timestamp?: string;
  details?: Record<string, unknown>;
};

const FALLBACK: HealthStatus = { status: "down" };

/** GET /health/live — liveness (no auth) */
export function fetchHealthLive(): Promise<ApiResponse<HealthStatus>> {
  return api.get(API_ROUTES.health.live, FALLBACK, { skipAuth: true });
}

/** GET /health/ready — readiness (DB / Prisma) */
export function fetchHealthReady(): Promise<ApiResponse<HealthStatus>> {
  return api.get(API_ROUTES.health.ready, FALLBACK, { skipAuth: true });
}
