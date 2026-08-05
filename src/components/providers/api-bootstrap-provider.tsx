"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { configureHttpClient } from "@/lib/http-client";
import { env, isApiMode } from "@/lib/env";
import {
  hydrateCurrentUser,
  refreshAccessToken,
} from "@/services/auth.service";
import {
  getAccessToken,
  getRefreshToken,
  useSessionStore,
} from "@/stores/session-store";

/**
 * Wires HttpClient with JWT getters + 401 sign-out.
 * In API mode, also hydrates the session from GET /auth/me.
 */
export function ApiBootstrapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const signOut = useSessionStore((s) => s.signOut);

  useEffect(() => {
    configureHttpClient({
      baseUrl: env.apiBaseUrl,
      getAccessToken: () => getAccessToken(),
      getRefreshToken: () => getRefreshToken(),
      onRefresh: async () => refreshAccessToken(),
      onUnauthorized: () => {
        signOut();
        router.replace("/login");
      },
      defaultHeaders: {
        "X-Company-Id": env.companyId,
        "X-Client": "rootk-hr-web",
      },
    });

    if (isApiMode()) {
      void hydrateCurrentUser();
    }
  }, [router, signOut]);

  return <>{children}</>;
}
