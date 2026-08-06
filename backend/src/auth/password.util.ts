import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** Bootstrap password for prisma seed only — production accounts use admin-set passwords. */
export const DEMO_PASSWORD = "Rootk@2026";

const FIXED_DEMO_SALT = "rootk_demo_salt_v1";

/**
 * Format: scrypt$<salt>$<hex hash>
 * Uses Node crypto — no extra dependency.
 */
export function hashPassword(
  password: string,
  salt: string = randomBytes(16).toString("hex")
): string {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Deterministic hash for prisma seed / fixtures. */
export function hashDemoPassword(): string {
  return hashPassword(DEMO_PASSWORD, FIXED_DEMO_SALT);
}

export function verifyPassword(
  password: string,
  stored: string | null | undefined
): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
