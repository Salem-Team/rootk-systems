"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CrmIncomingCallDialog } from "@/components/crm/crm-incoming-call-dialog";
import { useHasAnyPermission } from "@/hooks/use-permission";
import { useTranslation } from "@/hooks/use-translation";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { emitCrmOpenLead } from "@/lib/events";
import {
  askScreeningRole,
  cancelIncomingLeadNotification,
  consumePendingIncomingCall,
  dismissIncomingLeadCard,
  ensureIncomingCallAccess,
  incomingCallsSupported,
  listenForIncomingCalls,
  presentIncomingLeadCard,
  readIncomingCapabilities,
  startIncomingCallWatch,
  stopIncomingCallWatch,
} from "@/lib/native/incoming-call";
import { matchCrmLeadByPhone } from "@/services/crm/crm-calls.service";
import type { CrmLead } from "@/types/crm";

const SCREENING_ASKED = "rootk.incoming-screening-asked";

function tail(phone: string) {
  return phone.replace(/\D/g, "").slice(-9);
}

function clip(value: string, max = 160) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function rememberAsked(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* private mode */
  }
}

function wasAsked(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

/**
 * While a client is ringing a salesperson, show what they asked for and their
 * budget — even if that number was never saved in the phone contacts.
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
    const recent = recentRef;

    async function reveal(number: string) {
      const digits = tail(number);
      if (digits.length < 7) return;
      const now = Date.now();
      if (recent.current.tail === digits && now - recent.current.at < 8_000) return;
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
      const phone = displayCrmPhone(matched.phone, matched.phoneNormalized);
      const shown = await presentIncomingLeadCard({
        leadId: matched.id,
        title: translate("crm.call.incoming.title"),
        name: matched.name,
        phone,
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
      if (document.visibilityState === "visible" || !shown) {
        setLead(matched);
        setOpen(true);
      }
    }

    void (async () => {
      await ensureIncomingCallAccess();
      if (cancelled) return;
      detach = await listenForIncomingCalls(
        (event) => {
          if (event.state === "open" && event.leadId) {
            openLead(event.leadId);
            return;
          }
          if (event.state === "idle") {
            setOpen(false);
            setLead(null);
            void dismissIncomingLeadCard();
            void cancelIncomingLeadNotification();
            return;
          }
          if (event.state === "ringing" && event.number) void reveal(event.number);
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
      const pending = await consumePendingIncomingCall();
      if (pending?.leadId && pending.state === "open") openLead(pending.leadId);
      else if (pending?.number) void reveal(pending.number);

      const caps = await readIncomingCapabilities();
      if (cancelled) return;
      if (!caps.screening && !wasAsked(SCREENING_ASKED)) {
        rememberAsked(SCREENING_ASKED);
        toast.message(tRef.current("crm.call.incoming.screeningHint"));
        await askScreeningRole();
      }
    })();

    return () => {
      cancelled = true;
      detach?.();
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
        }
      }}
      onOpenLead={openLead}
    />
  );
}
