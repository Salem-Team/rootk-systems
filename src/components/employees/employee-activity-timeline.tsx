"use client";

import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  BookOpen,
  CheckCircle2,
  LogIn,
  LogOut,
  Megaphone,
  UserRound,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { EmployeeActivityItem } from "@/components/employees/profile-data";
import type { TranslationPath } from "@/i18n";

const META: Record<
  EmployeeActivityItem["type"],
  { icon: typeof LogIn; tone: string }
> = {
  check_in: {
    icon: LogIn,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  check_out: {
    icon: LogOut,
    tone: "bg-secondary text-secondary-foreground",
  },
  leave_request: {
    icon: CheckCircle2,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  profile_updated: {
    icon: UserRound,
    tone: "bg-primary/10 text-primary",
  },
  announcement: {
    icon: Megaphone,
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  training: {
    icon: BookOpen,
    tone: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
};

export function EmployeeActivityTimeline({
  items,
}: {
  items: EmployeeActivityItem[];
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  return (
    <motion.ul
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative space-y-0"
    >
      <span
        aria-hidden
        className="absolute bottom-2 start-[15px] top-2 w-px bg-border"
      />
      {items.map((item) => {
        const meta =
          META[item.type] ??
          META.announcement ?? {
            icon: Megaphone,
            tone: "bg-muted text-muted-foreground",
          };
        const Icon = meta.icon;
        return (
          <motion.li
            key={item.id}
            variants={fadeInUp}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            <span
              className={cn(
                "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card",
                meta.tone
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[13px] font-semibold">
                {t(item.titleKey as TranslationPath)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(item.detailKey as TranslationPath)}
              </p>
              <p className="mt-1.5 text-[10px] text-muted-foreground/80">
                {format(parseISO(item.at), "MMM d, yyyy · h:mm a", {
                  locale: dateLocale,
                })}
              </p>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
