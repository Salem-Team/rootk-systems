"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    setKey((k) => k + 1);
    setActive(true);
    const done = window.setTimeout(() => setActive(false), 700);
    return () => window.clearTimeout(done);
  }, [pathname]);

  if (!active) return null;

  return (
    <div key={key} className="route-progress-track" aria-hidden>
      <div className="route-progress-bar" />
    </div>
  );
}
