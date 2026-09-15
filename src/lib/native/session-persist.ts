import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { isNativeApp } from "@/lib/native/platform";
import { secureGet, secureRemove, secureSet } from "@/lib/native/secure-storage";

const ACCESS = "accessToken";
const REFRESH = "refreshToken";

function webStorage(): Storage {
  return window.localStorage;
}

function parsePersisted(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const hybrid: StateStorage = {
  getItem: async (name) => {
    if (typeof window === "undefined") return null;
    const raw = webStorage().getItem(name);
    if (!isNativeApp()) return raw;
    const parsed = parsePersisted(raw);
    if (!parsed || typeof parsed.state !== "object" || !parsed.state) {
      return raw;
    }
    const state = parsed.state as Record<string, unknown>;
    // Prefer Keychain/Keystore; fall back to WebView storage if secure miss.
    state.accessToken = (await secureGet(ACCESS)) ?? state.accessToken ?? null;
    state.refreshToken = (await secureGet(REFRESH)) ?? state.refreshToken ?? null;
    return JSON.stringify(parsed);
  },
  setItem: async (name, value) => {
    if (typeof window === "undefined") return;
    if (!isNativeApp()) {
      webStorage().setItem(name, value);
      return;
    }
    const parsed = parsePersisted(value);
    const state =
      parsed && typeof parsed.state === "object" && parsed.state
        ? (parsed.state as Record<string, unknown>)
        : null;
    const access = typeof state?.accessToken === "string" ? state.accessToken : null;
    const refresh =
      typeof state?.refreshToken === "string" ? state.refreshToken : null;

    let accessOk = !access;
    let refreshOk = !refresh;
    if (access) accessOk = await secureSet(ACCESS, access);
    else await secureRemove(ACCESS);
    if (refresh) refreshOk = await secureSet(REFRESH, refresh);
    else await secureRemove(REFRESH);

    // Only strip tokens from WebView storage when both secure writes succeeded.
    // Otherwise keep them in localStorage so login survives plugin failures.
    const stripTokens = accessOk && refreshOk;
    if (state) {
      if (stripTokens) {
        state.accessToken = null;
        state.refreshToken = null;
      } else if (access || refresh) {
        console.warn(
          "[session] secure storage write failed; keeping tokens in WebView storage"
        );
      }
    }
    webStorage().setItem(name, JSON.stringify(parsed ?? value));
  },
  removeItem: async (name) => {
    if (typeof window === "undefined") return;
    webStorage().removeItem(name);
    if (isNativeApp()) {
      await secureRemove(ACCESS);
      await secureRemove(REFRESH);
    }
  },
};

export const crmSessionPersistStorage = createJSONStorage(() => hybrid);

/** Direct write used after login so navigation does not race persist. */
export async function writeSessionPersistSnapshot(
  name: string,
  snapshot: unknown
): Promise<void> {
  await hybrid.setItem(name, JSON.stringify(snapshot));
}
