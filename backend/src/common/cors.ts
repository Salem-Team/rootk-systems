const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3010",
  "http://127.0.0.1:3010",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

/** Comma-separated CORS_ORIGIN → list Nest can pass to enableCors. */
export function parseCorsOrigins(raw?: string | null): string[] {
  const parts = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : DEFAULT_CORS_ORIGINS;
}
