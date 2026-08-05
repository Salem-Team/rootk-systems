import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  isAppError,
  type AppError,
} from "@/lib/errors";
import { env } from "@/lib/env";

/**
 * Production-ready HTTP client for NestJS REST APIs.
 * Wired at boot via `configureHttpClient()` with JWT + unauthorized handler.
 */
export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface HttpRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip Authorization header (e.g. login / refresh) */
  skipAuth?: boolean;
}

export interface HttpClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  getRefreshToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
  /** Optional: rotate access token; return new token or null */
  onRefresh?: (refreshToken: string) => Promise<string | null>;
  defaultHeaders?: Record<string, string>;
}

interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  details?: unknown;
}

export class HttpClient {
  private refreshPromise: Promise<string | null> | null = null;

  constructor(private readonly config: HttpClientConfig) {}

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const response = await this.rawRequest(path, options);

    if (response.status === 401 && !options.skipAuth) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retry = await this.rawRequest(path, options);
        return this.parseSuccess<T>(retry, path);
      }
      await this.config.onUnauthorized?.();
      throw new UnauthorizedError("Session expired");
    }

    if (!response.ok) {
      throw await this.toAppError(response, path);
    }

    return this.parseSuccess<T>(response, path);
  }

  get<T>(path: string, options?: Omit<HttpRequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, "method" | "body">
  ) {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, "method" | "body">
  ) {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  put<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, "method" | "body">
  ) {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  delete<T>(
    path: string,
    options?: Omit<HttpRequestOptions, "method" | "body">
  ) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  private async rawRequest(
    path: string,
    options: HttpRequestOptions
  ): Promise<Response> {
    const token =
      !options.skipAuth && this.config.getAccessToken
        ? await this.config.getAccessToken()
        : null;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(this.config.defaultHeaders ?? {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });
    } catch (error) {
      throw new InternalError("Network request failed", { path, error });
    }
  }

  private async parseSuccess<T>(response: Response, path: string): Promise<T> {
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new InternalError("Invalid JSON response", { path, status: response.status });
    }
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.config.getRefreshToken || !this.config.onRefresh) return false;

    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const refresh = await this.config.getRefreshToken!();
        if (!refresh) return null;
        try {
          return await this.config.onRefresh!(refresh);
        } catch {
          return null;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    const token = await this.refreshPromise;
    return Boolean(token);
  }

  private async toAppError(response: Response, path: string): Promise<AppError> {
    let body: NestErrorBody | string | null = null;
    try {
      body = (await response.json()) as NestErrorBody;
    } catch {
      try {
        body = await response.text();
      } catch {
        body = null;
      }
    }

    const message = extractMessage(body) || `HTTP ${response.status}`;
    const nestCode =
      typeof body === "object" && body && typeof body.code === "string"
        ? body.code
        : undefined;
    const rawDetails =
      typeof body === "object" && body ? body.details ?? undefined : undefined;
    const details =
      nestCode || rawDetails !== undefined
        ? {
            ...(rawDetails && typeof rawDetails === "object"
              ? (rawDetails as Record<string, unknown>)
              : rawDetails !== undefined
                ? { value: rawDetails }
                : {}),
            ...(nestCode ? { code: nestCode } : {}),
          }
        : body;

    switch (response.status) {
      case 400:
        return new ValidationError(message, details);
      case 401:
        return new UnauthorizedError(message, details);
      case 403:
        return new ForbiddenError(message, details);
      case 404:
        return new NotFoundError(message, details);
      case 409:
        return new ConflictError(message, details);
      default:
        return new InternalError(message, {
          path,
          status: response.status,
          details,
        });
    }
  }
}

function extractMessage(body: NestErrorBody | string | null): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (Array.isArray(body.message)) return body.message.join(", ");
  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;
  return "";
}

let client: HttpClient | null = null;

export function getHttpClient(): HttpClient {
  if (!client) {
    client = new HttpClient({
      baseUrl: env.apiBaseUrl,
      defaultHeaders: {
        "X-Company-Id": env.companyId,
      },
    });
  }
  return client;
}

export function setHttpClient(next: HttpClient): void {
  client = next;
}

/** Call once from ApiBootstrapProvider after session store is available. */
export function configureHttpClient(
  partial: Omit<HttpClientConfig, "baseUrl"> & { baseUrl?: string }
): HttpClient {
  client = new HttpClient({
    baseUrl: partial.baseUrl ?? env.apiBaseUrl,
    getAccessToken: partial.getAccessToken,
    getRefreshToken: partial.getRefreshToken,
    onUnauthorized: partial.onUnauthorized,
    onRefresh: partial.onRefresh,
    defaultHeaders: {
      "X-Company-Id": env.companyId,
      ...partial.defaultHeaders,
    },
  });
  return client;
}

export function toHttpError(error: unknown) {
  if (isAppError(error)) return error;
  return new InternalError(
    error instanceof Error ? error.message : "Unknown HTTP error",
    error
  );
}
