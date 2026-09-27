"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notificationVars } from "@/components/notifications/notification-item-helpers";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation } from "@/hooks/use-translation";
import { emitNotificationsUpdated } from "@/lib/events";
import { translateOrFallback } from "@/lib/i18n-content";
import { resolveNotificationHref } from "@/lib/notification-href";
import { isNotificationUnread } from "@/lib/notification-utils";
import {
  bindLocalNotificationOpen,
  presentLocalNotification,
} from "@/lib/native/present-local-notification";
import { useSessionStore } from "@/stores/session-store";
import type { TranslationPath } from "@/i18n";
import type { AppNotification } from "@/types";

const REQUEST_TITLE_KEYS = new Set([
  "notifications.crmClientRequestTitle",
  "notifications.crmClientRequestFollowUpTitle",
  "notifications.crmClientRequestReplyTitle",
]);

function isClientRequestNotification(item: AppNotification): boolean {
  return (
    item.entityType === "crm_client_request" ||
    REQUEST_TITLE_KEYS.has(item.titleKey)
  );
}

function presentBrowserNotification(
  title: string,
  body: string,
  href?: string
): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const note = new Notification(title, { body });
  note.onclick = () => {
    window.focus();
    note.close();
    if (href) window.location.assign(href);
  };
}

/** Bell + toast + phone banner when a client request notification arrives. */
export function useClientRequestNotificationArrivals() {
  const { items, loading } = useNotifications();
  const userId = useSessionStore((s) => s.user.id);
  const { t, locale } = useTranslation();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const seen = useRef<Set<string> | null>(null);
  const primedFor = useRef<string | null>(null);

  useEffect(() => {
    void bindLocalNotificationOpen((href) => routerRef.current.push(href));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (primedFor.current !== userId) {
      primedFor.current = userId;
      seen.current = null;
    }
    const unread = items.filter(
      (item) =>
        isClientRequestNotification(item) && isNotificationUnread(item, userId)
    );
    if (!seen.current) {
      seen.current = new Set(unread.map((item) => item.id));
      return;
    }
    const fresh = unread.filter((item) => !seen.current?.has(item.id));
    for (const item of unread) seen.current.add(item.id);
    if (fresh.length === 0) return;

    const newest = [...fresh].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )[0];
    emitNotificationsUpdated({
      playSound: true,
      audience: "all",
      recipientIds: [userId],
      category: newest.category,
      priority: newest.priority,
    });

    const inBackground = document.visibilityState !== "visible";
    for (const item of fresh.slice(0, 3)) {
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
      const href = resolveNotificationHref(item);
      toast(title, {
        description: body,
        duration: 8000,
        action: href
          ? {
              label: t("notifications.open"),
              onClick: () => router.push(href),
            }
          : undefined,
      });
      if (inBackground) {
        void presentLocalNotification({
          id: item.id,
          title,
          body,
          href,
        });
        presentBrowserNotification(title, body, href);
      }
    }
  }, [items, loading, locale, router, t, userId]);
}
