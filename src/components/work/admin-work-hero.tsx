"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CalendarDays, CheckCircle2, ListTodo } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";

export function AdminWorkHero({
  stats,
}: {
  stats: { open: number; overdue: number; done: number; today: number };
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
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
          <StatChip
            icon={<ListTodo className="h-3.5 w-3.5" />}
            label={t("workAdmin.kpiOpen")}
            value={String(stats.open)}
          />
          <StatChip
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label={t("workAdmin.kpiOverdue")}
            value={String(stats.overdue)}
          />
          <StatChip
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label={t("workAdmin.kpiDone")}
            value={String(stats.done)}
          />
          <StatChip
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label={t("workAdmin.kpiTodayMeetings")}
            value={String(stats.today)}
          />
        </div>
      </div>
    </motion.section>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.07] px-2.5 py-2 backdrop-blur-sm sm:px-3 sm:py-2.5">
      <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums text-white sm:text-xl">
        {value}
      </p>
    </div>
  );
}
