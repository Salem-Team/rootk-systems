"use client";

import { useCallback, useEffect, useRef } from "react";
import { isUiComposing } from "@/lib/ui-composing";

/**
 * Reloads employee-scoped feeds when:
 * - custom domain events fire (same tab)
 * - the window regains focus / becomes visible (admin assigned something elsewhere)
 * - a light poll interval (cross-user lag without websockets)
 *
 * Background polls/focus refreshes are skipped while a sheet/dialog is open
 * or the user is typing, so in-progress drafts are never wiped.
 */
export function useLiveReload(
  reload: () => void | Promise<void>,
  events: string[] = [],
  opts: { intervalMs?: number; enabled?: boolean } = {}
) {
  const { intervalMs = 45_000, enabled = true } = opts;
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const eventsKey = events.join("|");
  const skippedWhileBusy = useRef(false);

  const run = useCallback(() => {
    skippedWhileBusy.current = false;
    void reloadRef.current();
  }, []);

  const runIfIdle = useCallback(() => {
    if (isUiComposing()) {
      skippedWhileBusy.current = true;
      return;
    }
    run();
  }, [run]);

  useEffect(() => {
    if (!enabled) return;
    run();
  }, [enabled, run]);

  useEffect(() => {
    if (!enabled) return;
    let catchUpTimer: number | undefined;
    const catchUpIfNeeded = () => {
      if (!skippedWhileBusy.current) return;
      if (catchUpTimer) window.clearTimeout(catchUpTimer);
      catchUpTimer = window.setTimeout(() => {
        if (!skippedWhileBusy.current || isUiComposing()) return;
        run();
      }, 400);
    };
    const names = eventsKey ? eventsKey.split("|") : [];
    const onEvent = () => runIfIdle();
    for (const name of names) {
      window.addEventListener(name, onEvent);
    }
    const onFocus = () => runIfIdle();
    const onVis = () => {
      if (document.visibilityState === "visible") runIfIdle();
    };
    document.addEventListener("focusin", catchUpIfNeeded);
    document.addEventListener("focusout", catchUpIfNeeded);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    const timer =
      intervalMs > 0 ? window.setInterval(runIfIdle, intervalMs) : undefined;
    return () => {
      for (const name of names) {
        window.removeEventListener(name, onEvent);
      }
      document.removeEventListener("focusin", catchUpIfNeeded);
      document.removeEventListener("focusout", catchUpIfNeeded);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      if (catchUpTimer) window.clearTimeout(catchUpTimer);
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, eventsKey, intervalMs, run, runIfIdle]);
}
