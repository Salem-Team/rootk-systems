"use client";

import { motion, useReducedMotion } from "framer-motion";
import { softSpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface FilterShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Shared filter / toolbar surface used across modules. */
export function FilterShell({ children, className }: FilterShellProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={cn("toolbar-surface rounded-xl sm:p-4", className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 10, scale: 0.99 }}
      animate={{ y: 0, scale: 1 }}
      transition={softSpring}
      className={cn("toolbar-surface rounded-xl sm:p-4", className)}
    >
      {children}
    </motion.div>
  );
}
