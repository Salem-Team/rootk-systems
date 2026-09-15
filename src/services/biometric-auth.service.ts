/**
 * Biometric unlock preferences + flows.
 * Unlocks the sticky session already stored in Keychain/Keystore —
 * does not store or replay the account password.
 */

import {
  authenticateWithBiometrics,
  getBiometryAvailability,
  type BiometryAvailability,
  type BiometryKind,
} from "@/lib/native/biometrics";
import { isNativeApp } from "@/lib/native/platform";

const ENABLED_KEY = "rootk.biometric.enabled";
const PROMPTED_KEY = "rootk.biometric.prompted";
const USER_ID_KEY = "rootk.biometric.userId";
const EMAIL_KEY = "rootk.biometric.email";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}

function readText(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeText(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export type BiometricPreference = {
  enabled: boolean;
  prompted: boolean;
  userId: string | null;
  email: string | null;
};

export function getBiometricPreference(): BiometricPreference {
  return {
    enabled: readFlag(ENABLED_KEY),
    prompted: readFlag(PROMPTED_KEY),
    userId: readText(USER_ID_KEY),
    email: readText(EMAIL_KEY),
  };
}

export function isBiometricUnlockEnabled(): boolean {
  return isNativeApp() && getBiometricPreference().enabled;
}

export function markBiometricPrompted() {
  writeFlag(PROMPTED_KEY, true);
}

export async function checkBiometricSupport(): Promise<BiometryAvailability> {
  return getBiometryAvailability();
}

export async function enableBiometricUnlock(input: {
  userId: string;
  email: string;
  reason: string;
  cancelTitle?: string;
  title?: string;
  subtitle?: string;
}): Promise<{ ok: boolean; cancelled?: boolean; message?: string }> {
  const availability = await getBiometryAvailability();
  if (!availability.available) {
    return { ok: false, message: availability.reason || "unavailable" };
  }
  const auth = await authenticateWithBiometrics({
    reason: input.reason,
    cancelTitle: input.cancelTitle,
    title: input.title,
    subtitle: input.subtitle,
  });
  if (!auth.ok) {
    return {
      ok: false,
      cancelled: auth.cancelled,
      message: auth.message,
    };
  }
  writeFlag(ENABLED_KEY, true);
  writeFlag(PROMPTED_KEY, true);
  writeText(USER_ID_KEY, input.userId);
  writeText(EMAIL_KEY, input.email);
  return { ok: true };
}

export function disableBiometricUnlock() {
  writeFlag(ENABLED_KEY, false);
  writeFlag(PROMPTED_KEY, true);
}

/** Keep preference across password re-login for the same account. */
export function bindBiometricUser(input: { userId: string; email: string }) {
  const pref = getBiometricPreference();
  if (!pref.enabled) return;
  if (pref.userId && pref.userId !== input.userId) {
    // Different account — turn off until they opt in again.
    writeFlag(ENABLED_KEY, false);
    writeFlag(PROMPTED_KEY, false);
    writeText(USER_ID_KEY, null);
    writeText(EMAIL_KEY, null);
    return;
  }
  writeText(USER_ID_KEY, input.userId);
  writeText(EMAIL_KEY, input.email);
}

export async function unlockWithBiometrics(input: {
  reason: string;
  cancelTitle?: string;
  title?: string;
  subtitle?: string;
}): Promise<{ ok: boolean; cancelled?: boolean; message?: string }> {
  if (!isBiometricUnlockEnabled()) {
    return { ok: false, message: "disabled" };
  }
  const availability = await getBiometryAvailability();
  if (!availability.available) {
    return { ok: false, message: availability.reason || "unavailable" };
  }
  const auth = await authenticateWithBiometrics(input);
  if (!auth.ok) {
    return {
      ok: false,
      cancelled: auth.cancelled,
      message: auth.message,
    };
  }
  return { ok: true };
}

export function biometryLabelKey(kind: BiometryKind): string {
  if (kind === "face") return "auth.biometric.face";
  if (kind === "fingerprint") return "auth.biometric.fingerprint";
  if (kind === "iris") return "auth.biometric.iris";
  return "auth.biometric.generic";
}

export function shouldOfferBiometricOptIn(): boolean {
  if (!isNativeApp()) return false;
  const pref = getBiometricPreference();
  return !pref.enabled && !pref.prompted;
}
