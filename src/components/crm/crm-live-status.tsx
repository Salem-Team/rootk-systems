"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { TranslationPath } from "@/i18n";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

function formatRelative(
  updatedAt: number | null,
  now: number,
  t: (key: TranslationPath, vars?: Record<string, string | number>) => string
): string {
  if (!updatedAt) return t("crm.live.waiting");
  const sec = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (sec < 8) return t("crm.live.justNow");
  if (sec < 60) return t("crm.live.secondsAgo", { count: sec });
  const min = Math.floor(sec / 60);
  return t("crm.live.minutesAgo", { count: Math.min(min, 99) });
}

interface CrmLiveStatusProps {
  lastUpdatedAt: number | null;
  syncing?: boolean;
  className?: string;
}

/** Compact live sync chip for the CRM hub header. */
export function CrmLiveStatus({
  lastUpdatedAt,
  syncing = false,
  className,
}: CrmLiveStatusProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full bg-emerald-500/70",
            syncing ? "animate-ping" : "animate-pulse"
          )}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-foreground/80">{t("crm.live.label")}</span>
      <span className="text-border" aria-hidden>
        ·
      </span>
      {syncing ? (
        <span className="inline-flex items-center gap-1 text-primary">
          <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
          {t("crm.live.syncing")}
        </span>
      ) : (
        <span>{formatRelative(lastUpdatedAt, now, t)}</span>
      )}
    </div>
  );
}
