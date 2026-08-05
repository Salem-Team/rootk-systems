/**
 * Typed public env for frontend ↔ backend wiring.
 * Change NEXT_PUBLIC_DATA_SOURCE=api when NestJS is ready.
 */

export type DataSource = "local" | "api";

function readDataSource(): DataSource {
  const raw = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "local").toLowerCase();
  return raw === "api" ? "api" : "local";
}

export const env = {
  /** NestJS API origin including `/api` prefix */
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api",
  /** `local` = LocalStorage repositories; `api` = HttpClient REST */
  dataSource: readDataSource(),
  /** Optional company scope header for multi-tenant backends */
  companyId: process.env.NEXT_PUBLIC_COMPANY_ID ?? "cmp_rootk_001",
} as const;

export function isApiMode(): boolean {
  return env.dataSource === "api";
}

export function isLocalMode(): boolean {
  return env.dataSource === "local";
}
