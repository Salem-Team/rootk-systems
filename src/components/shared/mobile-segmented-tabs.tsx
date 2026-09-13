"use client";

import { cn } from "@/lib/utils";

interface MobileSegmentedTabsProps {
  children: React.ReactNode;
  className?: string;
  /** Stick under the chrome bar (default true). */
  sticky?: boolean;
}

/**
 * Sticky wrapper for mobile section tabs — keeps thumb-reach switching
 * without scrolling back to the top. Does not force layout on children.
 */
export function MobileSegmentedTabs({
  children,
  className,
  sticky = true,
}: MobileSegmentedTabsProps) {
  return (
    <div
      className={cn(
        sticky && "sticky-tabs -mx-3 px-3 sm:-mx-4 sm:px-4",
        className
      )}
    >
      {children}
    </div>
  );
}
