"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMyPermissions } from "@/services/permissions.service";
import { useSessionStore } from "@/stores/session-store";

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

  useEffect(() => {
    if (!ready || !authenticated) return;
    void getMyPermissions().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        useSessionStore.getState().setPermissions(res.data);
      }
    });
  }, [authenticated, ready, userId]);

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-9 w-9 animate-pulse rounded-lg border border-border bg-card shadow-[var(--shadow-card)]" />
        <p className="text-xs text-muted-foreground">ROOTK</p>
      </div>
    );
  }

  return <>{children}</>;
}
