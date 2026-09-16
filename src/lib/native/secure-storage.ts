/**
 * Native token storage.
 * Web uses the browser sandbox (Zustand persist).
 * Native mirrors tokens to Keychain/Keystore and keeps a WebView fallback.
 */

import { nativePlatform } from "@/lib/native/platform";

const PREFIX = "rootk.secure.";
/** Keep short — stalled Keychain must never block login / boot. */
const SECURE_TIMEOUT_MS = 900;

type SecurePlugin = {
  set: (options: { key: string; value: string }) => Promise<unknown>;
  get: (options: { key: string }) => Promise<{ value: string }>;
  remove: (options: { key: string }) => Promise<unknown>;
};

let cachedPlugin: SecurePlugin | null | undefined;
let pluginLoad: Promise<SecurePlugin | null> | null = null;

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
  if (cachedPlugin !== undefined) return cachedPlugin;
  if (!pluginLoad) {
    pluginLoad = (async () => {
      try {
        const mod = (await import("capacitor-secure-storage-plugin")) as {
          SecureStoragePlugin?: SecurePlugin;
          default?: SecurePlugin;
        };
        cachedPlugin = mod.SecureStoragePlugin ?? mod.default ?? null;
      } catch {
        cachedPlugin = null;
      }
      return cachedPlugin;
    })();
  }
  return withTimeout(pluginLoad, SECURE_TIMEOUT_MS, null);
}

/** @returns true when the value was written to the secure store. */
export async function secureSet(name: string, value: string): Promise<boolean> {
  const store = await plugin();
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
  const store = await plugin();
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
  const store = await plugin();
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
