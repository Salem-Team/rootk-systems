"use client";

import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  CalendarDays,
  FileText,
  GraduationCap,
  Megaphone,
  Plane,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  buildPortalAchievements,
  buildPortalEvents,
  buildPortalTimeline,
} from "@/components/portal/portal-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function PortalTimelinePanel() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const items = buildPortalTimeline();

  const icons = {
    attendance: Timer,
    leave: Plane,
    announcement: Megaphone,
    document: FileText,
    training: GraduationCap,
  } as const;

  return (
    <motion.ol
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative space-y-0"
    >
      <div
        className="absolute bottom-2 start-[19px] top-2 w-px bg-border"
        aria-hidden
      />
      {items.map((item) => {
        const Icon = icons[item.category];
        return (
          <motion.li
            key={item.id}
            variants={fadeInUp}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            <span className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
              <p className="text-sm font-semibold">{t(item.titleKey)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(item.bodyKey)}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {format(new Date(item.at), "MMM d, yyyy · h:mm a", {
                  locale: dateLocale,
                })}
              </p>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

export function PortalEventsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const events = buildPortalEvents();

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-3 sm:grid-cols-3"
    >
      {events.map((ev) => (
        <motion.li
          key={ev.id}
          variants={fadeInUp}
          className="surface-panel surface-panel-interactive p-4"
        >
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          <p className="mt-3 text-sm font-semibold">{t(ev.titleKey)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ev.date} · {t(ev.placeKey)}
          </p>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function PortalAchievementsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const items = buildPortalAchievements();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("portal.achievementsDesc")}</p>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-3"
      >
        {items.map((a) => (
          <motion.li
            key={a.id}
            variants={fadeInUp}
            className="surface-panel surface-panel-interactive surface-shine p-4"
          >
            <Badge variant="info">{a.earned}</Badge>
            <p className="mt-3 text-sm font-semibold">{t(a.titleKey)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(a.bodyKey)}</p>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
