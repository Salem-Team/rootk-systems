"use client";

import type { ReactNode } from "react";
import { MotionSurface } from "@/components/shared/motion-surface";
import { cn } from "@/lib/utils";

interface SectionPanelProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Skip panel-header chrome when content is self-contained. */
  bare?: boolean;
  /** Enable hover lift (for clickable / featured panels). */
  interactive?: boolean;
  /** Enter when scrolled into view (long pages). */
  inView?: boolean;
  delay?: number;
}

/** Canonical surface panel used across Attendance / Leave / Reports / Settings. */
export function SectionPanel({
  title,
  description,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  bare = false,
  interactive = false,
  inView = false,
  delay = 0,
}: SectionPanelProps) {
  const showHeader = !bare && (title || description || actions);

  return (
    <MotionSurface
      interactive={interactive}
      mode={inView ? "inView" : "mount"}
      delay={delay}
      className={cn("overflow-hidden", className)}
    >
      {showHeader ? (
        <div className="panel-header flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h3 className="flex items-center gap-2 font-display text-[0.95rem] font-semibold tracking-tight">
                {icon ? (
                  <span className="icon-well h-7 w-7 shrink-0">{icon}</span>
                ) : null}
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={cn(!bare && "panel-body", bodyClassName)}>{children}</div>
    </MotionSurface>
  );
}
