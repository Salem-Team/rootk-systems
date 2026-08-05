"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Clock, Flame, LogIn, LogOut, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, snappySpring, staggerFast } from "@/lib/animations";
import { demoNow } from "@/lib/mock-date";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

export function EmployeeOverviewHero({
  streak,
  score,
  leaveRemaining,
  todayRecord,
}: {
  streak: number;
  score: number;
  leaveRemaining: number;
  todayRecord: AttendanceRecord | null;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const user = useSessionStore((s) => s.user);
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const checkedIn = Boolean(todayRecord?.checkIn);
  const done = Boolean(todayRecord?.checkIn && todayRecord?.checkOut);
  const isLive = checkedIn && !done;

  function scrollToCheckIn() {
    document
      .getElementById("employee-checkin")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <motion.section
      variants={staggerFast}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="lg:hidden"
      aria-label={t("employeeHome.heroLabel")}
    >
      <motion.div
        variants={fadeInUp}
        className={cn(
          "relative overflow-hidden rounded-[1.35rem] border border-primary/20 p-4 shadow-[var(--shadow-card-hover)]",
          "bg-[linear-gradient(155deg,#061c4a_0%,#082868_46%,#0c3a7a_100%)] text-primary-foreground"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% 12%, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at 8% 88%, rgba(56,189,248,0.16), transparent 40%)",
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
              {format(demoNow(), "EEEE · d MMM", { locale: dateLocale })}
            </p>
            <h2 className="font-display mt-1.5 text-[1.45rem] font-bold leading-tight tracking-tight text-white">
              {t("portal.welcome", { name: t(user.firstNameKey) })}
            </h2>
            <p className="mt-1.5 text-[13px] leading-snug text-white/72">
              {done
                ? t("employeeHome.heroDone")
                : isLive
                  ? t("employeeHome.heroLive")
                  : t("employeeHome.heroReady")}
            </p>
          </div>
          {todayRecord ? (
            <StatusBadge status={todayRecord.status} onDark />
          ) : (
            <span className="shrink-0 rounded-full border border-amber-200/80 bg-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
              {t("attendance.notCheckedIn")}
            </span>
          )}
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <HeroStat
            icon={Flame}
            label={t("employeeHome.statStreak")}
            value={`${streak}`}
            hint={t("employeeHome.days")}
          />
          <HeroStat
            icon={Clock}
            label={t("employeeHome.statScore")}
            value={`${score}%`}
          />
          <HeroStat
            icon={Plane}
            label={t("employeeHome.statLeave")}
            value={`${leaveRemaining}`}
          />
        </div>

        <motion.div
          variants={fadeInUp}
          className="relative mt-4"
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          transition={snappySpring}
        >
          {!done ? (
            <Button
              type="button"
              onClick={scrollToCheckIn}
              className="h-12 w-full gap-2 rounded-xl bg-white text-primary hover:bg-white/92"
            >
              {isLive ? (
                <LogOut className="h-4 w-4" aria-hidden />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden />
              )}
              {isLive
                ? t("employeeHome.ctaCheckOut")
                : t("employeeHome.ctaCheckIn")}
              <ArrowDown className="ms-auto h-4 w-4 opacity-60" aria-hidden />
            </Button>
          ) : (
            <Button
              asChild
              variant="secondary"
              className="h-12 w-full gap-2 rounded-xl border-0 bg-white/12 text-white hover:bg-white/18"
            >
              <Link href="/attendance">
                <Clock className="h-4 w-4" aria-hidden />
                {t("employeeHome.ctaViewAttendance")}
              </Link>
            </Button>
          )}
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.08] px-2.5 py-2.5 backdrop-blur-[2px]">
      <p className="flex items-center gap-1 text-[11px] text-white/65">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-white">
        {value}
        {hint ? (
          <span className="ms-1 font-sans text-[10px] font-medium text-white/55">
            {hint}
          </span>
        ) : null}
      </p>
    </div>
  );
}
