/**
 * Native token storage.
 * Web uses the browser sandbox (Zustand persist).
 * Native prefers Keychain / Keystore via capacitor-secure-storage-plugin.
 */

import { nativePlatform } from "@/lib/native/platform";

const PREFIX = "rootk.secure.";

type SecurePlugin = {
  set: (options: { key: string; value: string }) => Promise<unknown>;
  get: (options: { key: string }) => Promise<{ value: string }>;
  remove: (options: { key: string }) => Promise<unknown>;
};

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
  const store = await plugin();
  if (!store) return false;
  try {
    await store.set({ key: PREFIX + name, value });
    return true;
  } catch {
    return false;
  }
}

export async function secureGet(name: string): Promise<string | null> {
  const store = await plugin();
  if (!store) return null;
  try {
    const result = await store.get({ key: PREFIX + name });
    return typeof result?.value === "string" ? result.value : null;
  } catch {
    return null;
  }
}

export async function secureRemove(name: string): Promise<void> {
  const store = await plugin();
  if (!store) return;
  try {
    await store.remove({ key: PREFIX + name });
  } catch {
    /* already absent */
  }
}
