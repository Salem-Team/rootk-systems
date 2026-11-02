"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Recharts ResponsiveContainer often collapses to width 0 under RTL flex layouts.
 * Force LTR measurement + an initial size so SVG paths actually paint.
 */
export function SafeResponsiveChart({
  height = 220,
  className,
  children,
}: {
  height?: number;
  className?: string;
  children: ReactElement;
}) {
  return (
    <div
      dir="ltr"
      className={cn("chart-frame w-full min-w-0", className)}
      style={{ height }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 520, height }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}
