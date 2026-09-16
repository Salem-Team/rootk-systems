"use client";

import { useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { toast } from "sonner";
import { CrmPostCallDialog } from "@/components/crm/crm-post-call-dialog";
import {
  enrichPendingCallOutcome,
  shouldAutoRecordNoAnswer,
} from "@/lib/crm/enrich-pending-call";
import {
  clearPendingCall,
  markPendingCallReturned,
  pendingCallIsRipe,
  type PendingCrmCall,
} from "@/lib/crm/pending-call";
import {
  isPendingCallPersisted,
  persistPendingCrmCall,
} from "@/lib/crm/persist-pending-call";
import { emitCrmUpdated } from "@/lib/events";
import { ensureCallInsightPermission } from "@/lib/native/call-insight";
import { isNativeApp } from "@/lib/native/platform";
import { useTranslation } from "@/hooks/use-translation";

/**
 * After a tel: dial, enrich duration from Android CallLog (talk time, not ring),
 * auto-record no-answer when the customer never answered, otherwise prompt.
 */
export function CrmPostCallHost() {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingCrmCall | null>(null);
  const [open, setOpen] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    void ensureCallInsightPermission();
  }, []);

  useEffect(() => {
    async function maybePrompt() {
      if (busyRef.current) return;
      if (!pendingCallIsRipe()) return;
      const frozen = markPendingCallReturned();
      if (!frozen) return;

      busyRef.current = true;
      try {
        const enriched = await enrichPendingCallOutcome(frozen);
        if (shouldAutoRecordNoAnswer(enriched)) {
          const res = await persistPendingCrmCall(enriched, {
            status: "unknown",
          });
          if (isPendingCallPersisted(res)) {
            clearPendingCall(enriched.externalCallId);
            toast.success(t("crm.call.savedAuto"));
            emitCrmUpdated();
            setOpen(false);
            setPending(null);
            return;
          }
        }
        setPending(enriched);
        setOpen(true);
      } finally {
        busyRef.current = false;
      }
    }

    const onVis = () => {
      if (document.visibilityState === "visible") void maybePrompt();
    };
    const onFocus = () => {
      void maybePrompt();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    let detach: (() => void) | undefined;
    if (isNativeApp()) {
      const handle = App.addListener("appStateChange", (state) => {
        if (state.isActive) void maybePrompt();
      });
      detach = () => {
        void Promise.resolve(handle).then((h) => h.remove());
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      detach?.();
    };
  }, [t]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      if (pending) clearPendingCall(pending.externalCallId);
      setPending(null);
    }
  }

  return (
    <CrmPostCallDialog
      pending={pending}
      open={open}
      onOpenChange={handleOpenChange}
      onRecorded={() => emitCrmUpdated()}
    />
  );
}
