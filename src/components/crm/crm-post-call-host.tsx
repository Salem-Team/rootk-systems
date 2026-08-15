"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { CrmPostCallDialog } from "@/components/crm/crm-post-call-dialog";
import {
  clearPendingCall,
  markPendingCallReturned,
  pendingCallIsRipe,
  type PendingCrmCall,
} from "@/lib/crm/pending-call";
import { isNativeApp } from "@/lib/native/platform";
import { emitCrmUpdated } from "@/lib/events";

/**
 * After a tel: dial, prompt for the call result on web focus / native resume.
 * Does not read iOS or Android call logs.
 */
export function CrmPostCallHost() {
  const [pending, setPending] = useState<PendingCrmCall | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function maybePrompt() {
      if (!pendingCallIsRipe()) return;
      const next = markPendingCallReturned();
      if (!next) return;
      setPending(next);
      setOpen(true);
    }

    const onVis = () => {
      if (document.visibilityState === "visible") maybePrompt();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", maybePrompt);

    let detach: (() => void) | undefined;
    if (isNativeApp()) {
      const handle = App.addListener("appStateChange", (state) => {
        if (state.isActive) maybePrompt();
      });
      detach = () => {
        void Promise.resolve(handle).then((h) => h.remove());
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", maybePrompt);
      detach?.();
    };
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      clearPendingCall();
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
