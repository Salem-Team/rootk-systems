"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { toast } from "sonner";
import { CrmIncomingCallDialog } from "@/components/crm/crm-incoming-call-dialog";
import { useHasAnyPermission } from "@/hooks/use-permission";
import { useTranslation } from "@/hooks/use-translation";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { CRM_UPDATED_EVENT, emitCrmOpenLead } from "@/lib/events";
import {
  askOverlayPermission,
  askScreeningRole,
  cancelIncomingLeadNotification,
  consumePendingIncomingCall,
  dismissIncomingLeadCard,
  ensureIncomingCallAccess,
  incomingCallsSupported,
  listenForIncomingCalls,
  presentIncomingLeadCard,
  readIncomingCapabilities,
  replayRecentIncomingCall,
  startIncomingCallWatch,
  stopIncomingCallWatch,
  syncIncomingLeadCache,
} from "@/lib/native/incoming-call";
import { matchCrmLeadByPhone } from "@/services/crm/crm-calls.service";
import { getCrmLeads } from "@/services/crm/crm-leads.service";
import type { CrmLead, CrmLeadStatus } from "@/types/crm";

let promptedThisLaunch = false;

function tail(phone: string) {
  return phone.replace(/\D/g, "").slice(-9);
}

function clip(value: string, max = 160) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

async function loadCallableLeads(): Promise<CrmLead[]> {
  const items: CrmLead[] = [];
  const statuses: CrmLeadStatus[] = ["active", "inactive"];
  for (const status of statuses) {
    for (let page = 1; page <= 15; page += 1) {
      const res = await getCrmLeads({
        status,
        page,
        pageSize: 100,
        sort: "updatedAt",
        order: "desc",
      });
      const batch = res.data?.items ?? [];
      items.push(...batch);
      const totalPages = res.data?.totalPages ?? page;
      if (batch.length < 100 || page >= totalPages) break;
    }
  }
  return items;
}

/**
 * While a client is ringing, show what they asked for and their budget.
 * The native layer matches a cached copy so it still works when the call
 * screen pauses the WebView.
 */
export function CrmIncomingCallHost() {
  const enabled = useHasAnyPermission([
    "crm.viewLeads",
    "crm.viewTeamLeads",
    "crm.viewOthersLeads",
  ]);
  const { t, locale } = useTranslation();
  const router = useRouter();
  const tRef = useRef(t);
  const localeRef = useRef(locale);
  const routerRef = useRef(router);
  tRef.current = t;
  localeRef.current = locale;
  routerRef.current = router;

  const recentRef = useRef<{ tail: string; at: number }>({ tail: "", at: 0 });
  const tokenRef = useRef(0);
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [open, setOpen] = useState(false);

  const openLead = useCallback((leadId: string) => {
    setOpen(false);
    setLead(null);
    void dismissIncomingLeadCard();
    void cancelIncomingLeadNotification();
    routerRef.current.push(`/crm?lead=${encodeURIComponent(leadId)}`);
    emitCrmOpenLead(leadId);
  }, []);

  useEffect(() => {
    if (!enabled || !incomingCallsSupported()) return;
    let cancelled = false;
    let detach: (() => void) | undefined;
    let detachApp: { remove: () => Promise<void> } | undefined;
    const recent = recentRef;

    async function syncCache() {
      const translate = tRef.current;
      const leads = await loadCallableLeads();
      if (cancelled) return;
      await syncIncomingLeadCache(leads, {
        rtl: localeRef.current === "ar",
        title: translate("crm.call.incoming.title"),
        request: translate("crm.call.incoming.request"),
        budget: translate("crm.call.incoming.budget"),
        empty: translate("crm.call.incoming.empty"),
        open: translate("crm.call.incoming.open"),
        hide: translate("crm.call.incoming.hide"),
      });
    }

    async function reveal(number: string, force = false) {
      const digits = tail(number);
      if (digits.length < 7) return;
      const now = Date.now();
      if (!force && recent.current.tail === digits && now - recent.current.at < 8_000) return;
      recent.current = { tail: digits, at: now };
      const my = ++tokenRef.current;
      const res = await matchCrmLeadByPhone(number);
      if (cancelled || my !== tokenRef.current) return;
      const matched = res.success ? res.data?.lead : null;
      if (!matched) return;

      const translate = tRef.current;
      const empty = translate("crm.call.incoming.empty");
      const request = clip(matched.request) || empty;
      const budget = clip(matched.budget) || empty;
      await presentIncomingLeadCard({
        leadId: matched.id,
        title: translate("crm.call.incoming.title"),
        name: matched.name,
        phone: displayCrmPhone(matched.phone, matched.phoneNormalized),
        company: matched.companyName.trim(),
        requestLabel: translate("crm.call.incoming.request"),
        request,
        budgetLabel: translate("crm.call.incoming.budget"),
        budget,
        openLabel: translate("crm.call.incoming.open"),
        dismissLabel: translate("crm.call.incoming.hide"),
        rtl: localeRef.current === "ar",
      });
      if (cancelled || my !== tokenRef.current) return;
      setLead(matched);
      setOpen(true);
    }

    const onCrm = () => {
      void syncCache();
    };
    window.addEventListener(CRM_UPDATED_EVENT, onCrm);

    void (async () => {
      await ensureIncomingCallAccess();
      if (cancelled) return;
      detach = await listenForIncomingCalls(
        (event) => {
          if (event.state === "open" && event.leadId) {
            openLead(event.leadId);
            return;
          }
          if (
            (event.state === "ringing" || event.state === "recall") &&
            event.number
          ) {
            void reveal(event.number, event.state === "recall");
          }
        },
        (leadId) => openLead(leadId),
        () => {
          setOpen(false);
          setLead(null);
          void cancelIncomingLeadNotification();
        }
      );
      if (cancelled) {
        detach();
        return;
      }
      await startIncomingCallWatch();
      void syncCache();
      const pending = await consumePendingIncomingCall();
      if (pending?.leadId && pending.state === "open") openLead(pending.leadId);
      else if (pending?.number) void reveal(pending.number, true);

      const appHandle = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        void syncCache();
        void replayRecentIncomingCall();
      });
      if (cancelled) {
        void appHandle.remove();
        return;
      }
      detachApp = appHandle;

      if (promptedThisLaunch) return;
      promptedThisLaunch = true;
      const caps = await readIncomingCapabilities();
      if (cancelled) return;
      if (!caps.screening) {
        toast.message(tRef.current("crm.call.incoming.screeningHint"));
        await askScreeningRole();
      }
      if (cancelled) return;
      const afterRole = await readIncomingCapabilities();
      if (!afterRole.overlay) {
        toast.message(tRef.current("crm.call.incoming.overlayHint"));
        await askOverlayPermission();
      }
    })();

    return () => {
      cancelled = true;
      detach?.();
      void detachApp?.remove();
      window.removeEventListener(CRM_UPDATED_EVENT, onCrm);
      void stopIncomingCallWatch();
    };
  }, [enabled, openLead]);

  return (
    <CrmIncomingCallDialog
      lead={lead}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setLead(null);
          void cancelIncomingLeadNotification();
          void dismissIncomingLeadCard();
        }
      }}
      onOpenLead={openLead}
    />
  );
}
