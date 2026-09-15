/**
 * Native token storage.
 * Web uses the browser sandbox (Zustand persist).
 * Native mirrors tokens to Keychain/Keystore and keeps a WebView fallback.
 */

import { nativePlatform } from "@/lib/native/platform";

const PREFIX = "rootk.secure.";
const SECURE_TIMEOUT_MS = 2_500;

type SecurePlugin = {
  set: (options: { key: string; value: string }) => Promise<unknown>;
  get: (options: { key: string }) => Promise<{ value: string }>;
  remove: (options: { key: string }) => Promise<unknown>;
};

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function plugin(): Promise<SecurePlugin | null> {
  if (nativePlatform() === "web") return null;
  try {
    const mod = (await import("capacitor-secure-storage-plugin")) as {
      SecureStoragePlugin?: SecurePlugin;
      default?: SecurePlugin;
    };
    return mod.SecureStoragePlugin ?? mod.default ?? null;
  } catch {
    return null;
  }
}

/** @returns true when the value was written to the secure store. */
export async function secureSet(name: string, value: string): Promise<boolean> {
  const store = await withTimeout(plugin(), SECURE_TIMEOUT_MS, null);
  if (!store) return false;
  try {
    return await withTimeout(
      store.set({ key: PREFIX + name, value }).then(() => true as const),
      SECURE_TIMEOUT_MS,
      false as const
    );
  } catch {
    return false;
  }
}

export async function secureGet(name: string): Promise<string | null> {
  const store = await withTimeout(plugin(), SECURE_TIMEOUT_MS, null);
  if (!store) return null;
  try {
    const result = await withTimeout(
      store.get({ key: PREFIX + name }),
      SECURE_TIMEOUT_MS,
      null as { value: string } | null
    );
    return typeof result?.value === "string" ? result.value : null;
  } catch {
    return null;
  }
}

export async function secureRemove(name: string): Promise<void> {
  const store = await withTimeout(plugin(), SECURE_TIMEOUT_MS, null);
  if (!store) return;
  try {
    await withTimeout(
      store.remove({ key: PREFIX + name }).then(() => undefined),
      SECURE_TIMEOUT_MS,
      undefined
    );
  } catch {
    /* already absent */
  }
}
