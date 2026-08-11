"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Radio } from "lucide-react";
import { getDailyPlan } from "@/services/daily-plan.service";
import { useLiveReload } from "@/hooks/use-live-reload";
import { useTickingNow } from "@/hooks/use-ticking-now";
import { useTranslation } from "@/hooks/use-translation";
import { resolveDailyPlanNow } from "@/lib/daily-plan";
import { DAILY_PLAN_UPDATED_EVENT } from "@/lib/events";
import { formatClockHm, formatClockRange } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { DailyPlan } from "@/types/daily-plan";

/** Live "what we're doing now" chip for the app sidebar. */
export function SidebarDailyPlan({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const now = useTickingNow(20_000);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  const load = useCallback(async () => {
    const res = await getDailyPlan();
    if (res.success) setPlan(res.data);
  }, []);

  useLiveReload(load, [DAILY_PLAN_UPDATED_EVENT], { intervalMs: 60_000 });

  const snapshot = resolveDailyPlanNow(plan?.slots ?? [], now);
  if (!plan || snapshot.phase === "empty") return null;

  const title =
    snapshot.phase === "current" && snapshot.current
      ? snapshot.current.title
      : snapshot.next
        ? snapshot.next.title
        : snapshot.previous?.title ?? t("dailyPlan.title");

  const label =
    snapshot.phase === "current"
      ? t("dailyPlan.now")
      : snapshot.phase === "after"
        ? t("dailyPlan.dayWrapped")
        : t("dailyPlan.upNext");

  const range =
    snapshot.phase === "current" && snapshot.current
      ? formatClockRange(
          snapshot.current.startTime,
          snapshot.current.endTime,
          locale
        )
      : snapshot.next
        ? formatClockHm(snapshot.next.startTime, locale)
        : formatClockHm(
            `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
            locale
          );

  return (
    <Link
      href="/daily-plan"
      onClick={onNavigate}
      className={cn(
        "mx-2.5 mt-3 block overflow-hidden rounded-xl border border-emerald-300/20 bg-gradient-to-b from-emerald-400/[0.12] to-white/[0.03] px-3 py-2.5 transition-colors hover:from-emerald-400/[0.16]",
        className
      )}
      aria-label={`${label}: ${title}`}
    >
      <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200/85">
        <Radio className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-white">{title}</p>
      <p className="mt-0.5 font-mono text-[10px] text-white/50">{range}</p>
    </Link>
  );
}
