"use client";

import { useEffect } from "react";
import { isApiMode } from "@/lib/env";
import { processLocalCrmFollowUpReminders } from "@/services/crm/crm-follow-up-reminders.service";
import { useSessionStore } from "@/stores/session-store";

const TICK_MS = 60_000;

/** Runs the local CRM follow-up reminder poller while the user is signed in. */
export function useCrmFollowUpReminders() {
  const authenticated = useSessionStore((s) => s.authenticated);

  useEffect(() => {
    if (!authenticated || isApiMode()) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      void processLocalCrmFollowUpReminders();
    };

    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authenticated]);
}
