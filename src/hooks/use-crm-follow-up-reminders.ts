"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { isApiMode } from "@/lib/env";
import { CRM_UPDATED_EVENT, emitCrmOpenLead } from "@/lib/events";
import { isNativeApp } from "@/lib/native/platform";
import {
  bindCrmFollowUpNotificationActions,
  clearNativeCrmFollowUpReminders,
  syncNativeCrmFollowUpReminders,
} from "@/lib/native/crm-follow-up-notifications";
import { processLocalCrmFollowUpReminders } from "@/services/crm/crm-follow-up-reminders.service";
import { getCrmLeads } from "@/services/crm/crm-leads.service";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";

const TICK_MS = 60_000;
const NATIVE_SYNC_MS = 5 * 60_000;

async function loadOwnedFollowUps(employeeId: string) {
  const items = [];
  const pageSize = 100;
  for (let page = 1; page <= 4; page += 1) {
    const res = await getCrmLeads({
      status: "active",
      ownerEmployeeId: employeeId || undefined,
      page,
      pageSize,
      sort: "nextFollowUpAt",
      order: "asc",
    });
    const batch = res.data?.items ?? [];
    items.push(...batch);
    if (batch.length < pageSize || items.length >= (res.data?.total ?? 0)) break;
  }
  return items;
}

/** Local poller + native OS alarms for call/meeting follow-ups. */
export function useCrmFollowUpReminders() {
  const authenticated = useSessionStore((s) => s.authenticated);
  const employeeId = useSessionStore((s) => s.user.employeeId);
  const { locale } = useTranslation();
  const router = useRouter();

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

  useEffect(() => {
    if (!authenticated || !isNativeApp()) {
      if (!authenticated) void clearNativeCrmFollowUpReminders();
      return;
    }
    const ownerId = employeeId?.trim() ?? "";
    if (!ownerId) return;

    let cancelled = false;
    const sync = async () => {
      if (cancelled) return;
      const leads = await loadOwnedFollowUps(ownerId);
      if (cancelled) return;
      await syncNativeCrmFollowUpReminders(
        leads,
        locale === "ar" ? "ar" : "en"
      );
    };

    void sync();
    const onCrm = () => void sync();
    window.addEventListener(CRM_UPDATED_EVENT, onCrm);
    const timer = window.setInterval(() => void sync(), NATIVE_SYNC_MS);
    let removeState: { remove: () => Promise<void> } | undefined;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void sync();
    }).then((handle) => {
      removeState = handle;
    });

    return () => {
      cancelled = true;
      window.removeEventListener(CRM_UPDATED_EVENT, onCrm);
      window.clearInterval(timer);
      void removeState?.remove();
    };
  }, [authenticated, employeeId, locale]);

  useEffect(() => {
    if (!authenticated || !isNativeApp()) return;
    let detach: (() => void) | undefined;
    void bindCrmFollowUpNotificationActions((leadId) => {
      router.push(`/crm?lead=${leadId}`);
      emitCrmOpenLead(leadId);
    }).then((fn) => {
      detach = fn;
    });
    return () => {
      detach?.();
    };
  }, [authenticated, router]);
}
