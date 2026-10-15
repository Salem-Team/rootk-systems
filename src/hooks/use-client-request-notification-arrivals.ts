"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notificationVars } from "@/components/notifications/notification-item-helpers";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation } from "@/hooks/use-translation";
import { emitCrmOpenLead, emitNotificationsUpdated, emitOpenClientRequest } from "@/lib/events";
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
  "notifications.crmClientRequestProposalTitle",
]);

const MEMORY_PREFIX = "rootk.client-request-toasts";

function isClientRequestNotification(item: AppNotification): boolean {
  return (
    item.entityType === "crm_client_request" ||
    REQUEST_TITLE_KEYS.has(item.titleKey)
  );
}

function memoryKey(userId: string): string {
  return `${MEMORY_PREFIX}:${userId}`;
}

function readShownIds(userId: string): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(memoryKey(userId));
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function writeShownIds(userId: string, ids: Set<string>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      memoryKey(userId),
      JSON.stringify([...ids].slice(-300))
    );
  } catch {
    /* private mode / quota */
  }
}

function presentBrowserNotification(
  title: string,
  body: string,
  onOpen: () => void
): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const note = new Notification(title, { body });
  note.onclick = () => {
    window.focus();
    note.close();
    onOpen();
  };
}

function openHref(href: string): void {
  const url = new URL(href, window.location.origin);
  const requestId = url.searchParams.get("request")?.trim();
  if (requestId) {
    window.setTimeout(() => emitOpenClientRequest(requestId), 80);
  }
  const leadId = url.searchParams.get("lead")?.trim();
  if (url.pathname === "/crm" && leadId) {
    emitCrmOpenLead(
      leadId,
      url.searchParams.get("sheet") === "requests" ? "requests" : "overview"
    );
  }
}

/** Bell + toast + phone banner when a client request notification arrives. */
export function useClientRequestNotificationArrivals() {
  const { items, loading, markRead } = useNotifications();
  const userId = useSessionStore((s) => s.user.id);
  const { t, locale } = useTranslation();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const seen = useRef<Set<string> | null>(null);
  const primedFor = useRef<string | null>(null);

  const remember = useCallback((id: string) => {
    const owner = userIdRef.current;
    if (!owner || !id) return;
    const ids = readShownIds(owner);
    ids.add(id);
    writeShownIds(owner, ids);
    seen.current?.add(id);
  }, []);

  const openNotification = useCallback(
    (item: AppNotification) => {
      const href = resolveNotificationHref(item) || "/client-requests";
      const related = itemsRef.current.filter((row) => {
        if (row.id === item.id) return true;
        return (
          isClientRequestNotification(row) &&
          Boolean(item.entityId) &&
          row.entityId === item.entityId &&
          row.titleKey === item.titleKey &&
          isNotificationUnread(row, userIdRef.current)
        );
      });
      const targets = related.length > 0 ? related : [item];
      for (const row of targets) {
        remember(row.id);
        toast.dismiss(row.id);
        void markReadRef.current(row.id);
      }
      routerRef.current.push(href);
      openHref(href);
    },
    [remember]
  );

  const openStored = useCallback(
    (detail: { href?: string; notificationId?: string }) => {
      if (detail.notificationId) {
        remember(detail.notificationId);
        toast.dismiss(detail.notificationId);
        void markReadRef.current(detail.notificationId);
      }
      if (!detail.href) return;
      routerRef.current.push(detail.href);
      openHref(detail.href);
    },
    [remember]
  );

  useEffect(() => {
    void bindLocalNotificationOpen((detail) => openStored(detail));
  }, [openStored]);

  useEffect(() => {
    if (loading || !userId) return;
    if (primedFor.current !== userId) {
      primedFor.current = userId;
      seen.current = null;
    }
    const shown = readShownIds(userId);
    const unread = items.filter(
      (item) =>
        isClientRequestNotification(item) && isNotificationUnread(item, userId)
    );
    if (!seen.current) {
      seen.current = new Set(shown);
      for (const item of unread) seen.current.add(item.id);
      writeShownIds(userId, seen.current);
      return;
    }

    const fresh = unread.filter(
      (item) => !seen.current?.has(item.id) && !shown.has(item.id)
    );
    for (const item of fresh) {
      seen.current?.add(item.id);
      shown.add(item.id);
    }
    writeShownIds(userId, shown);
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
        id: item.id,
        description: body,
        duration: 8000,
        action: {
          label: t("notifications.open"),
          onClick: () => openNotification(item),
        },
      });
      if (inBackground) {
        void presentLocalNotification({
          id: item.id,
          title,
          body,
          href,
        });
        presentBrowserNotification(title, body, () => openNotification(item));
      }
    }
  }, [items, loading, locale, openNotification, t, userId]);
}
