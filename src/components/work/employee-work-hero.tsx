"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CalendarDays, ListChecks, ListTodo } from "lucide-react";
import { EmployeeComposerTriggers } from "@/components/work/employee-work-composer";
import { useTranslation } from "@/hooks/use-translation";
import { demoNow } from "@/lib/mock-date";
import { staggerFast } from "@/lib/animations";
import type { SessionUser } from "@/stores/session-store";

export function EmployeeWorkHero({
  user,
  workEmployeeId,
  openCount,
  todayMeetingsCount,
  overdueCount,
  checklistPct,
  onAddTask,
  onAddMeeting,
}: {
  user: SessionUser;
  workEmployeeId: string;
  openCount: number;
  todayMeetingsCount: number;
  overdueCount: number;
  checklistPct: number;
  onAddTask: () => void;
  onAddMeeting: () => void;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  return (
    <motion.section
      variants={staggerFast}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative overflow-hidden rounded-[1.5rem] border border-primary/20 bg-[linear-gradient(155deg,#061c4a_0%,#082868_48%,#0c3a7a_100%)] p-5 text-primary-foreground shadow-[var(--shadow-card-hover)] sm:p-7"
      aria-label={t("workHub.heroLabel")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(circle at 88% 10%, rgba(255,255,255,0.18), transparent 32%), radial-gradient(circle at 10% 90%, rgba(56,189,248,0.18), transparent 42%)",
        }}
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {format(demoNow(), "EEEE · d MMM", { locale: dateLocale })}
          </p>
          <h1 className="font-display mt-2 text-[1.45rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
            {t("workHub.heroTitle", { name: user.firstName || user.displayName })}
          </h1>
          <p className="mt-2 hidden max-w-xl text-[14px] leading-relaxed text-white/72 sm:block">
            {t("workHub.heroDesc")}
          </p>
          <EmployeeComposerTriggers
            className="mt-4"
            disabled={!workEmployeeId}
            onAddTask={onAddTask}
            onAddMeeting={onAddMeeting}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeroStat
            icon={<ListTodo className="h-3.5 w-3.5" />}
            label={t("workHub.statOpen")}
            value={String(openCount)}
          />
          <HeroStat
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label={t("workHub.statMeetings")}
            value={String(todayMeetingsCount)}
          />
          <HeroStat
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label={t("workHub.statOverdue")}
            value={String(overdueCount)}
          />
          <HeroStat
            icon={<ListChecks className="h-3.5 w-3.5" />}
            label={t("workHub.statChecklist")}
            value={`${checklistPct}%`}
          />
        </div>
      </div>
    </motion.section>
  );
}

function HeroStat({
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
