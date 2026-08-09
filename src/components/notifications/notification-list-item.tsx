"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
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
import { useTranslation } from "@/hooks/use-translation";
import {
  formatNotificationTime,
  isNotificationUnread,
} from "@/lib/notification-utils";
import { translateOrFallback } from "@/lib/i18n-content";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";
import type { AppNotification, NotificationCategory } from "@/types";
import { notificationVars } from "./notification-item-helpers";

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
  organic_ad: Megaphone,
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
  organic_ad: "bg-primary/12 text-primary",
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
