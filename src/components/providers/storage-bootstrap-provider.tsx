"use client";

import { useEffect, useState } from "react";
import { BrandLoader } from "@/components/shared/brand-loader";
import { isLocalMode } from "@/lib/env";
import { ensureStorageBootstrapped } from "@/storage/bootstrap";

/**
 * Boots the Local Storage demo DB once on the client (local mode only).
 * In api mode the NestJS backend owns persistence — skip seeding.
 */
export function StorageBootstrapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(!isLocalMode());

  useEffect(() => {
    if (!isLocalMode()) {
      setReady(true);
      return;
    }

    let mounted = true;
    void ensureStorageBootstrapped().finally(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return <BrandLoader variant="app" />;
  }

  return <>{children}</>;
}
