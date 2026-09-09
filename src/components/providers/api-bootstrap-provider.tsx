"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { configureHttpClient } from "@/lib/http-client";
import { env, isApiMode } from "@/lib/env";
import {
  hydrateCurrentUser,
  refreshAccessToken,
} from "@/services/auth.service";
import {
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpiringSoon,
  SESSION_PERSIST_KEY,
  useSessionStore,
} from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";

/**
 * Wires HttpClient with JWT getters + 401 handling.
 * Signs out only after a definitive refresh rejection — not on network blips.
 * Keeps the session alive across tabs and brief offline periods.
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

  useEffect(() => {
    configureHttpClient({
      baseUrl: env.apiBaseUrl,
      getAccessToken: () => getAccessToken(),
      getRefreshToken: () => getRefreshToken(),
      onRefresh: async () => refreshAccessToken(),
      onUnauthorized: () => {
        // Definitive auth failure only (refresh rejected). Explicit Sign out
        // goes through signOutSession — this path is last-resort.
        signOut();
        toast.error(t("auth.sessionExpired"), { duration: 3200 });
        router.replace("/login");
      },
      defaultHeaders: {
        "X-Company-Id": env.companyId,
        "X-Client": "rootk-hr-web",
      },
    });
  }, [router, signOut, t]);

  useEffect(() => {
    // Safety: if persist never callbacks (corrupt storage), unblock the UI.
    const id = window.setTimeout(() => {
      if (!useSessionStore.getState().hasHydrated) {
        useSessionStore.setState({ hasHydrated: true });
      }
    }, 2500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !isApiMode()) return;
    void hydrateCurrentUser();
  }, [hasHydrated]);

  // Cross-tab session sync: another tab sign-out / token update.
  useEffect(() => {
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

  // Silent keep-alive: renew access token before it expires while the tab is open.
  useEffect(() => {
    if (!hasHydrated || !isApiMode()) return;

    async function keepAlive() {
      const state = useSessionStore.getState();
      if (!state.authenticated || !state.refreshToken) return;
      if (!isAccessTokenExpiringSoon(state.accessToken)) return;
      await refreshAccessToken();
    }

    void keepAlive();
    const id = window.setInterval(() => void keepAlive(), 10 * 60_000);

    function onVisible() {
      if (document.visibilityState === "visible") void keepAlive();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasHydrated]);

  return <>{children}</>;
}
