"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { getMyPermissions } from "@/services/permissions.service";
import { refreshAccessToken } from "@/services/auth.service";
import { isApiMode } from "@/lib/env";
import { isNativeApp } from "@/lib/native/platform";
import { BiometricLockGate } from "@/components/auth/biometric-lock-gate";
import { BiometricOptInHost } from "@/components/auth/biometric-opt-in-host";
import { hasActiveSession, useSessionStore } from "@/stores/session-store";

const PERMISSIONS_REFRESH_MIN_MS = 60_000;
const RECOVER_TIMEOUT_MS = 4_000;

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
  const accessToken = useSessionStore((s) => s.accessToken);
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const userId = useSessionStore((s) => s.user.id);
  const active = hasActiveSession({
    authenticated,
    accessToken,
    refreshToken,
  });
  const [recovering, setRecovering] = useState(false);
  const lastPermissionsAt = useRef(0);
  const recoverAttempted = useRef(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (active) {
      recoverAttempted.current = false;
      setRecovering(false);
      return;
    }

    // Sticky: if we still have a refresh token, try one silent renew before login.
    if (isApiMode() && refreshToken && !recoverAttempted.current) {
      recoverAttempted.current = true;
      setRecovering(true);
      let settled = false;
      let cancelled = false;
      const finish = () => {
        if (cancelled || settled) return;
        settled = true;
        setRecovering(false);
        const next = useSessionStore.getState();
        if (
          !hasActiveSession({
            authenticated: next.authenticated,
            accessToken: next.accessToken,
            refreshToken: next.refreshToken,
          })
        ) {
          router.replace("/login");
        }
      };
      void refreshAccessToken().finally(finish);
      const timeout = window.setTimeout(finish, RECOVER_TIMEOUT_MS);
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }

    router.replace("/login");
  }, [active, hasHydrated, refreshToken, router, pathname]);

  // Permissions are already on the session from login/persist — never block UI.
  useEffect(() => {
    if (!hasHydrated || !active) return;

    lastPermissionsAt.current = Date.now();
    void hydratePermissions();

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastPermissionsAt.current < PERMISSIONS_REFRESH_MIN_MS) return;
      lastPermissionsAt.current = now;
      void hydratePermissions();
    }
    document.addEventListener("visibilitychange", onVisible);

    let detachNative: (() => void) | undefined;
    if (isNativeApp()) {
      const handle = App.addListener("appStateChange", (state) => {
        if (!state.isActive) return;
        const now = Date.now();
        if (now - lastPermissionsAt.current < PERMISSIONS_REFRESH_MIN_MS) return;
        lastPermissionsAt.current = now;
        void hydratePermissions();
      });
      detachNative = () => {
        void Promise.resolve(handle).then((h) => h.remove());
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      detachNative?.();
    };
  }, [active, hasHydrated, userId]);

  if (!hasHydrated || recovering || !active) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="h-9 w-9 animate-pulse rounded-lg border border-border bg-card shadow-[var(--shadow-card)]" />
        <p className="text-xs text-muted-foreground">ROOTK</p>
      </div>
    );
  }

  return (
    <BiometricLockGate>
      <BiometricOptInHost />
      {children}
    </BiometricLockGate>
  );
}
