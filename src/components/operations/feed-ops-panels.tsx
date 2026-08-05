"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  GraduationCap,
  Megaphone,
  Plane,
  ClipboardList,
  Timer,
} from "lucide-react";
import { OpsWidget } from "@/components/operations/ops-widget";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import {
  buildOpsActivities,
  buildOpsDocuments,
} from "@/components/operations/operations-mock-data";
import { useNotifications } from "@/hooks/use-notifications";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { NotificationCategory } from "@/types";
import type { TranslationPath } from "@/i18n";

const CAT_FILTERS: Array<NotificationCategory | "all" | "unread"> = [
  "all",
  "unread",
  "leave",
  "attendance",
  "work",
  "announcement",
  "payroll",
  "system",
];

export function NotificationCenterWidget() {
  const { t, locale } = useTranslation();
  const userId = useSessionStore((s) => s.user.id);
  const { allItems, loading, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<(typeof CAT_FILTERS)[number]>("all");

  const visible = useMemo(() => {
    if (filter === "all") return allItems;
    if (filter === "unread") {
      return allItems.filter((n) => !n.readBy.includes(userId));
    }
    return allItems.filter((n) => n.category === filter);
  }, [allItems, filter, userId]);

  return (
    <OpsWidget
      id="notifications"
      title={t("ops.notifTitle")}
      description={t("ops.notifDesc")}
    >
      <NotificationFeed
        items={visible}
        userId={userId}
        locale={locale}
        loading={loading}
        hideHeader
        maxHeight="min(320px, 55vh)"
        onRead={(id) => void markRead(id)}
        onMarkAll={() => void markAllRead()}
        filterSlot={
          <div className="flex flex-wrap gap-1">
            {CAT_FILTERS.map((c) => (
              <FilterChip
                key={c}
                active={filter === c}
                onClick={() => setFilter(c)}
                label={
                  c === "all"
                    ? t("common.all")
                    : c === "unread"
                      ? t("notifications.filterUnread")
                      : t(`notifications.cat.${c}` as TranslationPath)
                }
              />
            ))}
          </div>
        }
      />
    </OpsWidget>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/25 bg-primary/[0.08] text-primary"
          : "border-border/70 text-muted-foreground hover:bg-muted/50"
      )}
    >
      {label}
    </button>
  );
}

export function ActivityCenterWidget() {
  const { t } = useTranslation();
  const items = buildOpsActivities();
  const icons = {
    attendance: Timer,
    leave: Plane,
    request: ClipboardList,
    announcement: Megaphone,
    document: FileText,
    training: GraduationCap,
  } as const;

  return (
    <OpsWidget
      id="activity"
      title={t("ops.activityTitle")}
      description={t("ops.activityDesc")}
    >
      <motion.ol
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="relative space-y-0"
      >
        <div
          className="absolute bottom-2 start-[19px] top-2 w-px bg-border"
          aria-hidden
        />
        {items.map((item) => {
          const Icon = icons[item.kind];
          return (
            <motion.li
              key={item.id}
              variants={fadeInUp}
              className="relative flex gap-3 pb-4 last:pb-0"
            >
              <span className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/15 px-3 py-2">
                <p className="text-sm font-semibold">{t(item.titleKey)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(item.bodyKey)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{item.at}</p>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </OpsWidget>
  );
}

export function RecentDocumentsWidget() {
  const { t } = useTranslation();
  const docs = buildOpsDocuments();

  return (
    <OpsWidget
      id="documents"
      title={t("ops.docsTitle")}
      description={t("ops.docsDesc")}
    >
      <ul className="space-y-2">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t(d.titleKey)}
            </span>
            <span className="text-[11px] text-muted-foreground">{d.at}</span>
          </li>
        ))}
      </ul>
    </OpsWidget>
  );
}
