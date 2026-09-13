"use client";

import { cn } from "@/lib/utils";

interface MobileActionBarProps {
  children: React.ReactNode;
  className?: string;
  /** Hide on large screens (default true). */
  mobileOnly?: boolean;
}

/**
 * Floating bottom action bar above the mobile tab bar — for primary CTAs / bulk actions.
 */
export function MobileActionBar({
  children,
  className,
  mobileOnly = true,
}: MobileActionBarProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[var(--mobile-action-bottom)] z-30 px-3",
        mobileOnly && "lg:hidden",
        className
      )}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg gap-2 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-[var(--shadow-float)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/85 [&_button]:min-h-11 [&_button]:flex-1 [&_button]:touch-manipulation">
        {children}
      </div>
    </div>
  );
}
