"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CalendarDays, CheckCircle2, ListTodo } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { AdminWorkHeroFilter } from "@/components/work/admin-work-panel-types";
import type { AdminWorkHeroChartStats } from "@/components/work/admin-work-hero-charts";
import type { TaskStatus } from "@/types/work";

const AdminWorkHeroCharts = dynamic(
  () =>
    import("@/components/work/admin-work-hero-charts").then(
      (m) => m.AdminWorkHeroCharts
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="h-[172px] animate-pulse rounded-2xl bg-white/10" />
        <div className="h-[172px] animate-pulse rounded-2xl bg-white/10" />
      </div>
    ),
  }
);

export function AdminWorkHero({
  stats,
  activeFilter = null,
  onFilter,
  onStatusFilter,
}: {
  stats: AdminWorkHeroChartStats;
  activeFilter?: AdminWorkHeroFilter;
  onFilter?: (filter: Exclude<AdminWorkHeroFilter, null>) => void;
  onStatusFilter?: (status: TaskStatus) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative overflow-hidden rounded-[1.5rem] border border-primary/20 bg-[linear-gradient(155deg,#061c4a_0%,#082868_48%,#0c3a7a_100%)] p-5 text-primary-foreground shadow-[var(--shadow-card-hover)] sm:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 90% 12%, rgba(255,255,255,0.16), transparent 34%), radial-gradient(circle at 8% 88%, rgba(56,189,248,0.16), transparent 40%)",
        }}
      />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {t("workAdmin.eyebrow")}
            </p>
            <h1 className="font-display mt-2 text-[1.45rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
              {t("workAdmin.title")}
            </h1>
            <p className="mt-2 hidden text-[14px] leading-relaxed text-white/72 sm:block">
              {t("workAdmin.description")}
            </p>
          </div>
          <div
            className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto"
            role="toolbar"
            aria-label={t("workAdmin.kpiFilterLabel")}
          >
            <StatChip
              icon={<ListTodo className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiOpen")}
              value={String(stats.open)}
              active={activeFilter === "open"}
              tone="sky"
              onClick={onFilter ? () => onFilter("open") : undefined}
            />
            <StatChip
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiOverdue")}
              value={String(stats.overdue)}
              active={activeFilter === "overdue"}
              tone="amber"
              warn={stats.overdue > 0}
              onClick={onFilter ? () => onFilter("overdue") : undefined}
            />
            <StatChip
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiDone")}
              value={String(stats.done)}
              active={activeFilter === "completed"}
              tone="emerald"
              onClick={onFilter ? () => onFilter("completed") : undefined}
            />
            <StatChip
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label={t("workAdmin.kpiTodayMeetings")}
              value={String(stats.today)}
              active={activeFilter === "today"}
              tone="violet"
              onClick={onFilter ? () => onFilter("today") : undefined}
            />
          </div>
        </div>

        <AdminWorkHeroCharts
          stats={stats}
          activeFilter={activeFilter}
          onStatusFilter={onStatusFilter}
        />
      </div>
    </motion.section>
  );
}

function StatChip({
  icon,
  label,
  value,
  active,
  tone,
  warn,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  active?: boolean;
  tone: "sky" | "amber" | "emerald" | "violet";
  warn?: boolean;
  onClick?: () => void;
}) {
  const toneRing = {
    sky: "ring-sky-300/70 bg-sky-400/20",
    amber: "ring-amber-300/70 bg-amber-400/20",
    emerald: "ring-emerald-300/70 bg-emerald-400/20",
    violet: "ring-violet-300/70 bg-violet-400/20",
  }[tone];

  const className = cn(
    "min-w-0 rounded-xl border px-2.5 py-2 text-start backdrop-blur-sm transition-[transform,background-color,box-shadow,border-color] duration-200 sm:px-3 sm:py-2.5",
    "touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
    onClick && "cursor-pointer active:scale-[0.98] sm:hover:bg-white/[0.12]",
    active
      ? cn("border-white/35 shadow-[0_0_0_1px_rgba(255,255,255,0.12)] ring-2", toneRing)
      : "border-white/10 bg-white/[0.07]",
    warn && !active && "border-amber-300/35"
  );

  const body = (
    <>
      <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-bold tabular-nums text-white sm:text-xl",
          warn && "text-amber-100"
        )}
      >
        {value}
      </p>
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={active}
    >
      {body}
    </button>
  );
}
