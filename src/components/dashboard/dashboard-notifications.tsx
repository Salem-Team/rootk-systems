"use client";

import { motion, useReducedMotion } from "framer-motion";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import { useNotifications } from "@/hooks/use-notifications";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";

export function DashboardNotifications() {
  const { locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const userId = useSessionStore((s) => s.user.id);
  const { items, loading, markRead, markAllRead } = useNotifications();

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-label="Notifications"
    >
      <NotificationFeed
        items={items}
        userId={userId}
        locale={locale}
        loading={loading}
        maxHeight="min(280px, 55vh)"
        onRead={(id) => void markRead(id)}
        onMarkAll={() => void markAllRead()}
      />
    </motion.section>
  );
}
