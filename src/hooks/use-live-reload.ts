"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Reloads employee-scoped feeds when:
 * - custom domain events fire (same tab)
 * - the window regains focus / becomes visible (admin assigned something elsewhere)
 * - a light poll interval (cross-user lag without websockets)
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

  const run = useCallback(() => {
    void reloadRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    run();
  }, [enabled, run]);

  useEffect(() => {
    if (!enabled) return;
    const names = eventsKey ? eventsKey.split("|") : [];
    const onEvent = () => run();
    for (const name of names) {
      window.addEventListener(name, onEvent);
    }
    const onFocus = () => run();
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    const timer =
      intervalMs > 0 ? window.setInterval(run, intervalMs) : undefined;
    return () => {
      for (const name of names) {
        window.removeEventListener(name, onEvent);
      }
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, eventsKey, intervalMs, run]);
}
