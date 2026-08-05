"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Megaphone, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { localizedAnnouncement } from "@/lib/i18n-content";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types";

const PRIORITY = {
  high: "danger" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

const PRIORITY_KEYS = {
  high: "dashboard.priorityHigh",
  medium: "dashboard.priorityMedium",
  low: "dashboard.priorityLow",
} as const;

export function Announcements({
  items,
  title,
  description,
}: {
  items: Announcement[];
  title?: string;
  description?: string;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority];
    });
  }, [items]);

  const pinnedId = ordered.find((i) => i.priority === "high")?.id;

  return (
    <section
      className="surface-panel flex h-full flex-col overflow-hidden"
      aria-labelledby="announcements-heading"
    >
      <div className="panel-header">
        <h3
          id="announcements-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
        >
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 truncate">
            {title ?? t("dashboard.announcements")}
          </span>
        </h3>
        {description || t("dashboard.announcementsDesc") ? (
          <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
            {description ?? t("dashboard.announcementsDesc")}
          </p>
        ) : null}
      </div>
      <div className="p-2.5 sm:p-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {ordered.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </p>
          ) : (
            ordered.map((item) => {
              const copy = localizedAnnouncement(item, t);
              const isPinned = item.id === pinnedId;
              const isRead = readIds.has(item.id);

              return (
                <motion.article
                  key={item.id}
                  variants={fadeInUp}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setReadIds((prev) => new Set(prev).add(item.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setReadIds((prev) => new Set(prev).add(item.id));
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl border border-border/70 bg-muted/25 p-3 text-start transition-all hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-lg",
                    isPinned && "border-primary/25 bg-primary/[0.03]",
                    !isRead && "ring-1 ring-primary/10"
                  )}
                  aria-label={`${copy.title}${isRead ? "" : ` · ${t("dashboard.unread")}`}`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-1.5">
                      {isPinned ? (
                        <Pin
                          className="mt-0.5 h-3 w-3 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : null}
                      <h4 className="text-[13px] font-semibold leading-snug break-words">
                        {copy.title}
                      </h4>
                      {!isRead ? (
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <Badge
                      variant={PRIORITY[item.priority]}
                      className="shrink-0"
                    >
                      {t(PRIORITY_KEYS[item.priority])}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3 sm:line-clamp-2">
                    {copy.body}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {item.author} ·{" "}
                    {format(new Date(item.createdAt), "d MMM yyyy", {
                      locale: dateLocale,
                    })}
                  </p>
                </motion.article>
              );
            })
          )}
        </motion.div>
      </div>
    </section>
  );
}
