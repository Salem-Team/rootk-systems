"use client";

import { motion, useReducedMotion } from "framer-motion";
import { softSpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface FilterShellProps {
  children: React.ReactNode;
  className?: string;
  /** Tighter padding for compact toolbars. */
  compact?: boolean;
  /** Stick below the navbar on scroll — desktop only (not mobile). */
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
      "lg:sticky lg:top-[var(--chrome-sticky-top)] lg:z-20 lg:-mx-1 lg:backdrop-blur-xl lg:supports-[backdrop-filter]:bg-card/90",
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
