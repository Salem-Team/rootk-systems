/**
 * Remember-me preferences for the login form.
 * On native apps we always keep the sticky session; this mainly restores email.
 */

import { isNativeApp } from "@/lib/native/platform";

const REMEMBER_FLAG_KEY = "rootk.remember.me";
const REMEMBER_EMAIL_KEY = "rootk.remember.email";

function readFlag(key: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
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

/** Default ON for native (sticky sessions); web uses last choice or ON. */
export function getRememberMeDefault(): boolean {
  if (isNativeApp()) return true;
  const stored = readFlag(REMEMBER_FLAG_KEY);
  return stored !== false;
}

export function setRememberMePreference(value: boolean) {
  writeFlag(REMEMBER_FLAG_KEY, value);
}

export function getRememberedEmail(): string | null {
  return readText(REMEMBER_EMAIL_KEY)?.trim() || null;
}

export function saveRememberedLogin(input: {
  remember: boolean;
  email: string;
}) {
  setRememberMePreference(input.remember);
  if (input.remember) {
    writeText(REMEMBER_EMAIL_KEY, input.email.trim().toLowerCase());
  } else {
    writeText(REMEMBER_EMAIL_KEY, null);
  }
}
