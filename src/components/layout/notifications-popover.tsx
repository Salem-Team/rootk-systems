"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation } from "@/hooks/use-translation";
import { useSessionStore } from "@/stores/session-store";
import { cn } from "@/lib/utils";

export function NotificationsPopover() {
  const { t, isRtl, locale } = useTranslation();
  const userId = useSessionStore((s) => s.user.id);
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead, loading } =
    useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={t("common.notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={isRtl ? "start" : "end"}
        className="w-[min(calc(100dvw-1.5rem),380px)] overflow-hidden p-0 shadow-[var(--shadow-float)]"
      >
        <NotificationFeed
          items={items.slice(0, 12)}
          userId={userId}
          locale={locale}
          loading={loading}
          dense
          maxHeight="360px"
          onRead={(id) => void markRead(id)}
          onMarkAll={() => void markAllRead()}
          onNavigate={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
