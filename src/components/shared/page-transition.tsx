"use client";

import { cn } from "@/lib/utils";

/**
 * Canonical page content wrapper.
 * Route enter/exit lives in AppShell. Optional CSS cascade staggers direct
 * children without nesting another Framer opacity layer (headers skipped).
 */
export function PageTransition({
  children,
  className,
  cascade = true,
}: {
  children: React.ReactNode;
  className?: string;
  cascade?: boolean;
}) {
  return (
    <div className={cn("page-stack", cascade && "page-cascade", className)}>
      {children}
    </div>
  );
}
