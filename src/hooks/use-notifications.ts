"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification.service";
import { useSessionStore } from "@/stores/session-store";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import { isNotificationUnread } from "@/lib/notification-utils";
import type { AppNotification, NotificationCategory } from "@/types";

/**
 * Unified notification inbox — live across the whole app via
 * NOTIFICATION_UPDATED_EVENT.
 */
export function useNotifications(options?: {
  category?: NotificationCategory | "all";
}) {
  const role = useSessionStore((s) => s.role);
  const userId = useSessionStore((s) => s.user.id);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const category = options?.category ?? "all";

  const load = useCallback(async () => {
    try {
      const res = await getNotifications(role, userId);
      if (res.success) setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onUpdate = () => {
      void load();
    };
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(NOTIFICATION_UPDATED_EVENT, onUpdate);
  }, [load]);

  const visible = useMemo(() => {
    if (category === "all") return items;
    return items.filter((n) => n.category === category);
  }, [items, category]);

  const unreadCount = useMemo(
    () => items.filter((item) => isNotificationUnread(item, userId)).length,
    [items, userId]
  );

  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id && !item.readBy.includes(userId)
            ? { ...item, readBy: [...item.readBy, userId] }
            : item
        )
      );
      const res = await markNotificationRead(id, userId);
      if (!res.success) await load();
    },
    [userId, load]
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((item) =>
        item.readBy.includes(userId)
          ? item
          : { ...item, readBy: [...item.readBy, userId] }
      )
    );
    const res = await markAllNotificationsRead(userId, role);
    if (res.success) setItems(res.data);
    else await load();
  }, [role, userId, load]);

  return {
    items: visible,
    allItems: items,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    reload: load,
  };
}
