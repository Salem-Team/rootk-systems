"use client";

import type { ReactElement } from "react";
import { SafeResponsiveChart } from "@/components/shared/safe-responsive-chart";

export function ChartPanel({
  title,
  hint,
  children,
  height = 280,
}: {
  title: string;
  hint?: string;
  children: ReactElement;
  height?: number;
}) {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h4 className="text-[0.95rem] font-semibold tracking-tight">{title}</h4>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="panel-body min-w-0" role="img" aria-label={title}>
        <SafeResponsiveChart height={height}>{children}</SafeResponsiveChart>
      </div>
    </section>
  );
}
