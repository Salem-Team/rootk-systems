"use client";

import { motion, useReducedMotion } from "framer-motion";
import { softSpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface FilterShellProps {
  children: React.ReactNode;
  className?: string;
  /** Tighter padding for compact toolbars. */
  compact?: boolean;
  /** Stick below the navbar on scroll (mobile-friendly filters). */
  sticky?: boolean;
}

/** Shared filter / toolbar surface used across modules. */
export function FilterShell({
  children,
  className,
  compact = false,
  sticky = false,
}: FilterShellProps) {
  const reduceMotion = useReducedMotion();

  const surfaceClass = cn(
    "toolbar-surface rounded-xl",
    compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4",
    sticky &&
      "sticky top-[3.4rem] z-20 -mx-1 backdrop-blur-xl supports-[backdrop-filter]:bg-card/90 sm:top-[3.55rem]",
    className
  );

  if (reduceMotion) {
    return <div className={surfaceClass}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ y: 10, scale: 0.99 }}
      animate={{ y: 0, scale: 1 }}
      transition={softSpring}
      className={surfaceClass}
    >
      {children}
    </motion.div>
  );
}
