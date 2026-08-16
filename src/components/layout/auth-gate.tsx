"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMyPermissions } from "@/services/permissions.service";
import { useSessionStore } from "@/stores/session-store";

const PERMISSIONS_HYDRATE_TIMEOUT_MS = 8_000;

async function hydratePermissions() {
  const res = await getMyPermissions();
  if (res.success && Array.isArray(res.data)) {
    useSessionStore.getState().setPermissions(res.data);
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authenticated = useSessionStore((s) => s.authenticated);
  const userId = useSessionStore((s) => s.user.id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.replace("/login");
    }
  }, [authenticated, ready, router, pathname]);

  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) {
      setPermissionsReady(false);
      return;
    }
    let cancelled = false;
    setPermissionsReady(false);
    void Promise.race([
      hydratePermissions(),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, PERMISSIONS_HYDRATE_TIMEOUT_MS);
      }),
    ]).finally(() => {
      if (!cancelled) setPermissionsReady(true);
    });

    function onVisible() {
      if (document.visibilityState === "visible") {
        void hydratePermissions();
      }
    }
    function onFocus() {
      void hydratePermissions();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [authenticated, ready, userId]);

  if (!ready || !authenticated || !permissionsReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-9 w-9 animate-pulse rounded-lg border border-border bg-card shadow-[var(--shadow-card)]" />
        <p className="text-xs text-muted-foreground">ROOTK</p>
      </div>
    );
  }

  return <>{children}</>;
}
