"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { configureHttpClient } from "@/lib/http-client";
import { env, isApiMode } from "@/lib/env";
import { isNativeApp, nativePlatform } from "@/lib/native/platform";
import {
  hydrateCurrentUser,
  refreshAccessToken,
} from "@/services/auth.service";
import {
  getAccessToken,
  getRefreshToken,
  hasActiveSession,
  isAccessTokenExpiringSoon,
  SESSION_PERSIST_KEY,
  useSessionStore,
} from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";

function clientHeader(): string {
  const platform = nativePlatform();
  if (platform === "android") return "rootk-hr-android";
  if (platform === "ios") return "rootk-hr-ios";
  return "rootk-hr-web";
}

/**
 * Wires HttpClient with JWT getters + 401 handling.
 * Sticky sessions: only explicit Sign out (or a definitively revoked refresh
 * token) clears the session — never network blips or brief storage glitches.
 */
export function ApiBootstrapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const signOut = useSessionStore((s) => s.signOut);
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const kickLock = useRef(false);

  useEffect(() => {
    configureHttpClient({
      baseUrl: env.apiBaseUrl,
      getAccessToken: () => getAccessToken(),
      getRefreshToken: () => getRefreshToken(),
      onRefresh: async () => refreshAccessToken(),
      onUnauthorized: () => {
        // Last resort: refresh token rejected by the server.
        // Never clear a session that still has a refresh token in memory —
        // a parallel renew may still succeed.
        const state = useSessionStore.getState();
        if (state.refreshToken) {
          void refreshAccessToken().then((result) => {
            if (result === null && !kickLock.current) {
              kickLock.current = true;
              signOut();
              toast.error(t("auth.sessionExpired"), { duration: 3200 });
              router.replace("/login");
            }
          });
          return;
        }
        if (kickLock.current) return;
        kickLock.current = true;
        signOut();
        toast.error(t("auth.sessionExpired"), { duration: 3200 });
        router.replace("/login");
      },
      defaultHeaders: {
        "X-Company-Id": env.companyId,
        "X-Client": clientHeader(),
      },
    });
  }, [router, signOut, t]);

  useEffect(() => {
    // Native Keystore reads can be slow; give more time before forcing hydrate.
    const ms = isNativeApp() ? 8_000 : 4_000;
    const id = window.setTimeout(() => {
      if (!useSessionStore.getState().hasHydrated) {
        useSessionStore.setState({ hasHydrated: true });
      }
    }, ms);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !isApiMode()) return;
    if (!hasActiveSession()) {
      // Do not wipe storage here — AuthGate / login will handle unsigned state.
      return;
    }
    kickLock.current = false;
    void hydrateCurrentUser();
  }, [hasHydrated]);

  // Cross-tab session sync (web only). Native WebViews can emit spurious
  // storage clears that must not force logout.
  useEffect(() => {
    if (isNativeApp()) return;

    function onStorage(event: StorageEvent) {
      if (event.key !== SESSION_PERSIST_KEY) return;
      if (event.newValue == null) {
        if (useSessionStore.getState().authenticated) {
          signOut();
          router.replace("/login");
        }
        return;
      }
      void useSessionStore.persist.rehydrate();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router, signOut]);

  // Silent keep-alive: renew access token while the app is open / resumes.
  useEffect(() => {
    if (!hasHydrated || !isApiMode()) return;

    async function keepAlive() {
      const state = useSessionStore.getState();
      if (!state.refreshToken) return;
      if (!state.authenticated && !state.accessToken) return;
      // Renew when missing or near expiry — keep the user signed in.
      if (
        state.accessToken &&
        !isAccessTokenExpiringSoon(state.accessToken, 15 * 60_000)
      ) {
        return;
      }
      const result = await refreshAccessToken();
      if (result && result !== "transient") {
        kickLock.current = false;
      }
    }

    void keepAlive();
    const id = window.setInterval(() => void keepAlive(), 5 * 60_000);

    function onVisible() {
      if (document.visibilityState === "visible") void keepAlive();
    }
    function onFocus() {
      void keepAlive();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    let detachNative: (() => void) | undefined;
    if (isNativeApp()) {
      const handle = App.addListener("appStateChange", (state) => {
        if (state.isActive) void keepAlive();
      });
      detachNative = () => {
        void Promise.resolve(handle).then((h) => h.remove());
      };
    }

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      detachNative?.();
    };
  }, [hasHydrated]);

  return <>{children}</>;
}
