/** PostgreSQL / Prisma–friendly opaque string IDs (UUID-backed). */
export function createId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid.slice(0, 16)}`;
}
