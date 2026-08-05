import { unwrapList, type ListPayload } from "@/api/contracts";
import { normalizeAuditTimestamps } from "@/lib/api-adapters";
import { getHttpClient } from "@/lib/http-client";
import { fail, fromError, ok } from "@/services/api-result";
import type { ApiResponse } from "@/types";

/**
 * Normalize NestJS / frontend envelopes into ApiResponse<T>.
 * Accepts either `{ success, data }` or a bare payload.
 */
export function normalizeResponse<T>(raw: unknown, fallback: T): ApiResponse<T> {
  if (
    raw &&
    typeof raw === "object" &&
    "success" in raw &&
    "data" in raw
  ) {
    const envelope = raw as ApiResponse<T>;
    return {
      data: envelope.data,
      success: envelope.success,
      message: envelope.message,
      error: envelope.error,
    };
  }

  if (raw === undefined || raw === null) {
    return ok(fallback);
  }

  return ok(raw as T);
}

function normalizeEntityDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeEntityDeep);
  }
  if (
    value &&
    typeof value === "object" &&
    ("createdAt" in value || "updatedAt" in value)
  ) {
    const base = normalizeAuditTimestamps(
      value as {
        createdAt?: string | Date;
        updatedAt?: string | Date;
        deletedAt?: string | Date | null;
      }
    );
    const out: Record<string, unknown> = { ...base };
    for (const [key, child] of Object.entries(out)) {
      if (child && typeof child === "object") {
        out[key] = normalizeEntityDeep(child);
      }
    }
    return out;
  }
  return value;
}

async function run<T>(
  fallback: T,
  exec: () => Promise<unknown>
): Promise<ApiResponse<T>> {
  try {
    const raw = await exec();
    const normalized = normalizeResponse<T>(raw, fallback);
    if (!normalized.success) {
      return fail(
        (normalized.data as T | undefined) ?? fallback,
        normalized.message ?? "Request failed",
        normalized.error?.code ?? "INTERNAL_ERROR",
        normalized.error?.details
      );
    }
    return {
      ...normalized,
      data: normalizeEntityDeep(normalized.data) as T,
    };
  } catch (error) {
    return fromError(error, fallback);
  }
}

/**
 * List GET helper — accepts bare arrays or Nest `{ items, total, ... }` envelopes.
 */
async function runList<T>(
  fallback: T[],
  exec: () => Promise<unknown>
): Promise<ApiResponse<T[]>> {
  try {
    const raw = await exec();
    const normalized = normalizeResponse<ListPayload<T>>(raw, fallback);
    if (!normalized.success) {
      return fail(
        fallback,
        normalized.message ?? "Request failed",
        normalized.error?.code ?? "INTERNAL_ERROR",
        normalized.error?.details
      );
    }
    const items = unwrapList(normalized.data).map(
      (item) => normalizeEntityDeep(item) as T
    );
    return {
      ...normalized,
      data: items,
    };
  } catch (error) {
    return fromError(error, fallback);
  }
}

export const api = {
  get<T>(path: string, fallback: T, options?: { skipAuth?: boolean }) {
    return run(fallback, () =>
      getHttpClient().get(path, { skipAuth: options?.skipAuth })
    );
  },
  /** GET that unwraps paginated or bare-array list payloads. */
  getList<T>(path: string, fallback: T[] = [], options?: { skipAuth?: boolean }) {
    return runList(fallback, () =>
      getHttpClient().get(path, { skipAuth: options?.skipAuth })
    );
  },
  post<T>(
    path: string,
    body: unknown,
    fallback: T,
    options?: { skipAuth?: boolean }
  ) {
    return run(fallback, () =>
      getHttpClient().post(path, body, { skipAuth: options?.skipAuth })
    );
  },
  patch<T>(path: string, body: unknown, fallback: T) {
    return run(fallback, () => getHttpClient().patch(path, body));
  },
  put<T>(path: string, body: unknown, fallback: T) {
    return run(fallback, () => getHttpClient().put(path, body));
  },
  delete<T>(path: string, fallback: T) {
    return run(fallback, () => getHttpClient().delete(path));
  },
};
