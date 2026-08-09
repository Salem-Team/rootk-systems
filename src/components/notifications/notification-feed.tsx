"use client";

import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/use-translation";
import { isNotificationUnread } from "@/lib/notification-utils";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";
import { NotificationListItem } from "./notification-list-item";

export { NotificationCategoryIcon } from "./notification-list-item";
export { NotificationListItem } from "./notification-list-item";

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
