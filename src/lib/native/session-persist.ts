import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { isNativeApp } from "@/lib/native/platform";
import { secureGet, secureRemove, secureSet } from "@/lib/native/secure-storage";

const ACCESS = "accessToken";
const REFRESH = "refreshToken";
/** Non-secret session fields mirrored so Keychain alone can rebuild after WebView wipe. */
const META = "sessionMeta";

type SessionMeta = {
  role?: unknown;
  authenticated?: boolean;
  user?: unknown;
  permissions?: unknown;
  impersonation?: unknown;
};

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

function parseMeta(raw: string | null): SessionMeta | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
}

function stateFromParsed(
  parsed: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!parsed || typeof parsed.state !== "object" || !parsed.state) return null;
  return parsed.state as Record<string, unknown>;
}

function hasToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

async function mirrorTokensToSecure(
  access: string | null,
  refresh: string | null
): Promise<void> {
  await Promise.all([
    access ? secureSet(ACCESS, access) : secureRemove(ACCESS),
    refresh ? secureSet(REFRESH, refresh) : secureRemove(REFRESH),
  ]);
}

async function mirrorMetaToSecure(
  state: Record<string, unknown> | null
): Promise<void> {
  if (!state) {
    await secureRemove(META);
    return;
  }
  const meta: SessionMeta = {
    role: state.role,
    authenticated: Boolean(state.authenticated),
    user: state.user,
    permissions: state.permissions,
    impersonation: state.impersonation ?? null,
  };
  await secureSet(META, JSON.stringify(meta));
}

/** Background Keychain mirror — never awaited on the login/navigation path. */
function scheduleSecureMirror(value: string): void {
  const parsed = parsePersisted(value);
  const state = stateFromParsed(parsed);
  const access = hasToken(state?.accessToken) ? state!.accessToken : null;
  const refresh = hasToken(state?.refreshToken) ? state!.refreshToken : null;
  void (async () => {
    try {
      await mirrorTokensToSecure(access, refresh);
      await mirrorMetaToSecure(state);
    } catch {
      console.warn("[session] background Keychain mirror failed");
    }
  })();
}

const hybrid: StateStorage = {
  getItem: async (name) => {
    if (typeof window === "undefined") return null;
    const raw = webStorage().getItem(name);
    if (!isNativeApp()) return raw;

    const parsed = parsePersisted(raw);
    const state = stateFromParsed(parsed);

    // Fast path: WebView already has tokens — skip Keychain (biggest boot lag source).
    if (state && (hasToken(state.accessToken) || hasToken(state.refreshToken))) {
      state.authenticated = true;
      return JSON.stringify(parsed);
    }

    // WebView miss / token-less — restore from Keychain in parallel.
    const [access, refresh] = await Promise.all([
      secureGet(ACCESS),
      secureGet(REFRESH),
    ]);

    if (state) {
      state.accessToken = access ?? state.accessToken ?? null;
      state.refreshToken = refresh ?? state.refreshToken ?? null;
      if (hasToken(state.accessToken) || hasToken(state.refreshToken)) {
        state.authenticated = true;
      }
      return JSON.stringify(parsed);
    }

    if (!access && !refresh) return raw;

    const meta = parseMeta(await secureGet(META));
    const rebuilt = {
      state: {
        role: meta?.role ?? undefined,
        authenticated: true,
        accessToken: access,
        refreshToken: refresh,
        user: meta?.user ?? undefined,
        permissions: meta?.permissions ?? undefined,
        impersonation: meta?.impersonation ?? null,
      },
      version: 0,
    };
    try {
      webStorage().setItem(name, JSON.stringify(rebuilt));
    } catch {
      /* quota / private mode */
    }
    return JSON.stringify(rebuilt);
  },
  setItem: async (name, value) => {
    if (typeof window === "undefined") return;
    // Sync WebView first — login must never wait on Keychain.
    webStorage().setItem(name, value);
    if (!isNativeApp()) return;
    scheduleSecureMirror(value);
  },
  removeItem: async (name) => {
    if (typeof window === "undefined") return;
    webStorage().removeItem(name);
    if (isNativeApp()) {
      await Promise.all([
        secureRemove(ACCESS),
        secureRemove(REFRESH),
        secureRemove(META),
      ]);
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

/**
 * Sync WebView write only. Keychain mirrors in the background.
 * Use before navigation so login never stalls.
 */
export function writeSessionPersistSnapshotSync(
  name: string,
  snapshot: unknown
): void {
  if (typeof window === "undefined") return;
  const value = JSON.stringify(snapshot);
  webStorage().setItem(name, value);
  if (isNativeApp()) {
    scheduleSecureMirror(value);
  }
}
