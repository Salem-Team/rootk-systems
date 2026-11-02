"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Recharts ResponsiveContainer often collapses to width 0 under RTL flex layouts.
 * Force LTR measurement + an initial size so SVG paths actually paint.
 * On phones, start with a narrower seed so the first paint fits the screen.
 */
export function SafeResponsiveChart({
  height = 220,
  mobileHeight,
  className,
  children,
}: {
  height?: number;
  mobileHeight?: number;
  className?: string;
  children: ReactElement;
}) {
  const [frame, setFrame] = useState({ width: 360, height });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => {
      const mobile = mq.matches;
      const w = Math.max(
        280,
        Math.min(window.innerWidth - 32, mobile ? 420 : 720)
      );
      setFrame({
        width: w,
        height: mobile ? (mobileHeight ?? Math.min(height, 220)) : height,
      });
    };
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, [height, mobileHeight]);

  return (
    <div
      dir="ltr"
      className={cn("chart-frame w-full min-w-0 max-w-full", className)}
      style={{ height: frame.height }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={frame}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}
