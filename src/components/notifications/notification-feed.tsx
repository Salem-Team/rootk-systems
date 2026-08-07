"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Megaphone,
  Plane,
  Settings2,
  Timer,
  Wallet,
  AtSign,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/use-translation";
import {
  formatNotificationTime,
  isNotificationUnread,
} from "@/lib/notification-utils";
import { formatHmDuration } from "@/lib/duration-format";
import { translateOrFallback } from "@/lib/i18n-content";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";
import type { AppNotification, NotificationCategory } from "@/types";

const DURATION_BODY_KEYS = new Set([
  "notifications.lateCheckInBody",
  "notifications.earlyLeaveBody",
]);

function formatAtTimestamp(raw: unknown, locale: "en" | "ar"): string {
  if (typeof raw !== "string" || !raw) return String(raw ?? "");
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function notificationVars(
  item: AppNotification,
  t: (path: TranslationPath, vars?: Record<string, string | number>) => string,
  locale: "en" | "ar"
): Record<string, string | number> | undefined {
  const base = { ...(item.vars ?? {}) };
  if (base.at != null) {
    base.at = formatAtTimestamp(base.at, locale);
  }
  if (!DURATION_BODY_KEYS.has(item.bodyKey)) return base;
  const minutes = Number(base.minutes ?? 0);
  return {
    ...base,
    duration: formatHmDuration(minutes, t),
  };
}

const CATEGORY_ICON: Record<
  NotificationCategory,
  ComponentType<{ className?: string }>
> = {
  leave: Plane,
  attendance: Timer,
  work: ClipboardList,
  payroll: Wallet,
  schedule: CalendarDays,
  announcement: Megaphone,
  system: Settings2,
  mention: AtSign,
  target: Target,
};

const CATEGORY_TONE: Record<NotificationCategory, string> = {
  leave: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  attendance: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  work: "bg-sky-500/12 text-sky-800 dark:text-sky-300",
  payroll: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  schedule: "bg-teal-500/12 text-teal-800 dark:text-teal-300",
  announcement: "bg-rose-500/12 text-rose-800 dark:text-rose-300",
  system: "bg-muted text-muted-foreground",
  mention: "bg-primary/12 text-primary",
  target: "bg-primary/12 text-primary",
};

export function NotificationCategoryIcon({
  category,
  className,
}: {
  category: NotificationCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category] ?? Briefcase;
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        CATEGORY_TONE[category],
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

export function NotificationListItem({
  item,
  userId,
  locale,
  dense,
  onRead,
  onNavigate,
}: {
  item: AppNotification;
  userId: string;
  locale: "en" | "ar";
  dense?: boolean;
  onRead: (id: string) => void;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const unread = isNotificationUnread(item, userId);
  const time = formatNotificationTime(item.createdAt, locale);
  const vars = notificationVars(item, t, locale);
  const title = translateOrFallback(
    t,
    item.titleKey as TranslationPath,
    item.titleKey,
    vars
  );
  const body = translateOrFallback(
    t,
    item.bodyKey as TranslationPath,
    item.bodyKey,
    vars
  );

  const content = (
    <>
      <NotificationCategoryIcon category={item.category} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "text-[13px] leading-snug",
              unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
            )}
          >
            {title}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {item.priority === "urgent" || item.priority === "high" ? (
              <Badge
                variant={item.priority === "urgent" ? "danger" : "warning"}
                className="h-5 px-1.5 text-[10px]"
              >
                {t(`notifications.priority.${item.priority}` as TranslationPath)}
              </Badge>
            ) : null}
            {unread ? (
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                aria-hidden
              />
            ) : null}
          </span>
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
          {body}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-medium">
            {t(`notifications.cat.${item.category}` as TranslationPath)}
          </span>
          <span>{time}</span>
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex w-full gap-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
    dense ? "rounded-xl px-2.5 py-2.5" : "rounded-2xl border px-3 py-3",
    unread
      ? dense
        ? "bg-primary/[0.04]"
        : "border-primary/20 bg-primary/[0.04]"
      : dense
        ? "hover:bg-muted/40"
        : "border-border/60 bg-card hover:bg-muted/25"
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={className}
        onClick={() => {
          if (unread) void onRead(item.id);
          onNavigate?.();
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (unread) void onRead(item.id);
        onNavigate?.();
      }}
    >
      {content}
    </button>
  );
}

export function NotificationFeed({
  items,
  userId,
  locale,
  loading,
  dense,
  emptyTitle,
  emptyDesc,
  maxHeight = "320px",
  onRead,
  onMarkAll,
  onNavigate,
  filterSlot,
  hideHeader,
}: {
  items: AppNotification[];
  userId: string;
  locale: "en" | "ar";
  loading?: boolean;
  dense?: boolean;
  emptyTitle?: string;
  emptyDesc?: string;
  maxHeight?: string;
  onRead: (id: string) => void;
  onMarkAll?: () => void;
  onNavigate?: () => void;
  filterSlot?: ReactNode;
  hideHeader?: boolean;
}) {
  const { t } = useTranslation();
  const unread = items.filter((n) => isNotificationUnread(n, userId)).length;

  return (
    <div className="flex min-h-0 flex-col">
      {!hideHeader ? (
        <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{t("notifications.title")}</span>
              {unread > 0 ? (
                <Badge
                  variant="danger"
                  className="h-5 min-w-5 justify-center px-1.5"
                >
                  {unread > 99 ? "99+" : unread}
                </Badge>
              ) : null}
            </p>
            <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
              {unread > 0
                ? t("notifications.unreadCount", { count: unread })
                : t("notifications.empty")}
            </p>
          </div>
          {unread > 0 && onMarkAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2 text-xs sm:px-3"
              onClick={() => void onMarkAll()}
            >
              {t("notifications.markAll")}
            </Button>
          ) : null}
        </div>
      ) : unread > 0 && onMarkAll ? (
        <div className="flex justify-end border-b border-border/50 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => void onMarkAll()}
          >
            {t("notifications.markAll")}
          </Button>
        </div>
      ) : null}

      {filterSlot ? (
        <div className="border-b border-border/50 px-3 py-2">{filterSlot}</div>
      ) : null}

      {loading ? (
        <div className="space-y-2 px-3 py-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-muted-foreground">
            <Bell className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm font-medium">
            {emptyTitle ?? t("notifications.empty")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {emptyDesc ?? t("notifications.emptyDesc")}
          </p>
        </div>
      ) : (
        <ScrollArea
          style={{ maxHeight }}
          className="px-2 py-2"
        >
          <ul className={cn("space-y-1", !dense && "space-y-2 p-1")}>
            {items.map((item) => (
              <li key={item.id}>
                <NotificationListItem
                  item={item}
                  userId={userId}
                  locale={locale}
                  dense={dense}
                  onRead={onRead}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
