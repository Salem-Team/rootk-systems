import type { Prisma } from "@prisma/client";

export const ADMIN_VISIBLE_PASSWORD_KEY = "adminVisiblePassword";

export function readAdminVisiblePassword(
  metadata: unknown
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)[ADMIN_VISIBLE_PASSWORD_KEY];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function withAdminVisiblePassword(
  metadata: unknown,
  password: string | null
): Prisma.InputJsonValue {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  if (password && password.trim()) {
    base[ADMIN_VISIBLE_PASSWORD_KEY] = password.trim();
  } else {
    delete base[ADMIN_VISIBLE_PASSWORD_KEY];
  }
  return base as Prisma.InputJsonValue;
}
