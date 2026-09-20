"use client";

import { useEffect, useRef } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { useTranslation } from "@/hooks/use-translation";

const CHUNK_RELOAD_KEY = "rootk_chunk_reload_at";
const CHUNK_RELOAD_COOLDOWN_MS = 20_000;

function isStaleClientBundleError(error: Error): boolean {
  const name = error.name || "";
  const message = error.message || "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Cannot find module\.|ENOENT.*\.next/i.test(message)
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  const triedReload = useRef(false);

  useEffect(() => {
    console.error(error);
    if (triedReload.current || typeof window === "undefined") return;
    if (!isStaleClientBundleError(error)) return;

    triedReload.current = true;
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");
    const now = Date.now();
    if (now - last < CHUNK_RELOAD_COOLDOWN_MS) return;

    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
  }, [error]);

  function hardReset() {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.location.assign(window.location.href);
      return;
    }
    reset();
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ErrorState
        title={t("common.error")}
        description={t("a11y.errorDesc")}
        actionLabel={t("common.tryAgain")}
        onAction={hardReset}
      />
    </div>
  );
}
