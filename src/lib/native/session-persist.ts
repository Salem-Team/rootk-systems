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

    // Best-effort Keychain mirror. Always keep the full snapshot (with tokens)
    // in WebView storage so a slow/failed secureGet never wipes a fresh login.
    if (access) {
      const ok = await secureSet(ACCESS, access);
      if (!ok) {
        console.warn("[session] secure access token write failed; WebView fallback kept");
      }
    } else {
      await secureRemove(ACCESS);
    }
    if (refresh) {
      const ok = await secureSet(REFRESH, refresh);
      if (!ok) {
        console.warn("[session] secure refresh token write failed; WebView fallback kept");
      }
    } else {
      await secureRemove(REFRESH);
    }

    webStorage().setItem(name, value);
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
