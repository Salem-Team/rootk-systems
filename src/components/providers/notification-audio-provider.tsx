"use client";

import { useEffect } from "react";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import type { NotificationUpdatedDetail } from "@/lib/events";
import {
  companyAllowsSound,
  normalizeCompanyNotifications,
} from "@/lib/notification-policy";
import {
  bindNotificationAudioUnlock,
  playNotificationChime,
} from "@/lib/notification-sound";
import {
  notificationMatchesPrefs,
  notificationVisibleToUser,
} from "@/lib/notification-utils";
import { getSettings } from "@/services/settings.service";
import { getUserPreferences } from "@/services/user-preferences.service";
import { useSessionStore } from "@/stores/session-store";
import type { AppNotification, NotificationAudience } from "@/types";

function audiencesForRole(role: "admin" | "employee"): NotificationAudience[] {
  return role === "admin" ? ["all", "admin"] : ["all", "employee"];
}

/**
 * Single app-wide listener for notification chimes.
 * Must not live inside useNotifications — multiple inbox mounts would double-play.
 */
export function NotificationAudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = useSessionStore((s) => s.user.id);
  const employeeId = useSessionStore((s) => s.user.employeeId);
  const role = useSessionStore((s) => s.role);

  useEffect(() => bindNotificationAudioUnlock(), []);

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<NotificationUpdatedDetail>).detail;
      if (!detail?.playSound) return;

      const probe = {
        audience: detail.audience ?? "all",
        recipientIds: detail.recipientIds,
        category: detail.category ?? "system",
        priority: detail.priority ?? "normal",
      } as AppNotification;

      if (
        !notificationVisibleToUser(
          probe,
          userId,
          audiencesForRole(role),
          employeeId
        )
      ) {
        return;
      }

      void (async () => {
        try {
          const [prefsRes, settingsRes] = await Promise.all([
            getUserPreferences(userId),
            getSettings(),
          ]);
          const prefs = prefsRes.success ? prefsRes.data?.notifications : null;
          const policy = normalizeCompanyNotifications(
            settingsRes.success ? settingsRes.data.notifications : undefined
          );
          if (
            !companyAllowsSound(
              policy,
              (detail.priority ?? "normal") as AppNotification["priority"]
            )
          ) {
            return;
          }
          if (prefs?.sound === false) return;
          if (!notificationMatchesPrefs(probe, prefs)) return;
          playNotificationChime();
        } catch {
          playNotificationChime();
        }
      })();
    };

    window.addEventListener(NOTIFICATION_UPDATED_EVENT, onUpdate);
    return () =>
      window.removeEventListener(NOTIFICATION_UPDATED_EVENT, onUpdate);
  }, [userId, employeeId, role]);

  return <>{children}</>;
}
