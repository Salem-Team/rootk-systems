import { isAppError } from "@/lib/errors";
import type { ApiResponse } from "@/types";

/** Map repository/service results to the existing UI envelope (no extra latency). */
export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { data, success: true, message };
}

export function fail<T>(
  data: T,
  message: string,
  code = "INTERNAL_ERROR",
  details?: unknown
): ApiResponse<T> {
  return {
    data,
    success: false,
    message,
    error: { code, details },
  };
}

export function fromError<T>(error: unknown, fallback: T): ApiResponse<T> {
  if (isAppError(error)) {
    return fail(fallback, error.message, error.code, error.details);
  }
  const message =
    error instanceof Error ? error.message : "Unexpected error occurred";
  return fail(fallback, message);
}
