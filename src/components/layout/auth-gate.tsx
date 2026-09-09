"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMyPermissions } from "@/services/permissions.service";
import { useSessionStore } from "@/stores/session-store";

const PERMISSIONS_HYDRATE_TIMEOUT_MS = 8_000;
const PERMISSIONS_REFRESH_MIN_MS = 60_000;

async function hydratePermissions() {
  try {
    const res = await getMyPermissions();
    if (res.success && Array.isArray(res.data)) {
      useSessionStore.getState().setPermissions(res.data);
    }
  } catch {
    // Network / transient failures must not kick the user out.
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const authenticated = useSessionStore((s) => s.authenticated);
  const userId = useSessionStore((s) => s.user.id);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const lastPermissionsAt = useRef(0);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!authenticated) {
      router.replace("/login");
    }
  }, [authenticated, hasHydrated, router, pathname]);

  useEffect(() => {
    if (!hasHydrated || !authenticated) {
      setPermissionsReady(false);
      return;
    }
    let cancelled = false;
    setPermissionsReady(false);
    lastPermissionsAt.current = Date.now();
    void Promise.race([
      hydratePermissions(),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, PERMISSIONS_HYDRATE_TIMEOUT_MS);
      }),
    ]).finally(() => {
      if (!cancelled) setPermissionsReady(true);
    });

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastPermissionsAt.current < PERMISSIONS_REFRESH_MIN_MS) return;
      lastPermissionsAt.current = now;
      void hydratePermissions();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authenticated, hasHydrated, userId]);

  if (!hasHydrated || !authenticated || !permissionsReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-9 w-9 animate-pulse rounded-lg border border-border bg-card shadow-[var(--shadow-card)]" />
        <p className="text-xs text-muted-foreground">ROOTK</p>
      </div>
    );
  }

  return <>{children}</>;
}
