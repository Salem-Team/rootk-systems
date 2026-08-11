"use client";

import { useEffect, useState } from "react";

/** Wall-clock that ticks so "now" UI stays in sync with the daily plan. */
export function useTickingNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, intervalMs);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);

  return now;
}
