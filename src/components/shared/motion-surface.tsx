"use client";

import { motion, useReducedMotion } from "framer-motion";
import { softSpring, snappySpring, surfaceEnter } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface MotionSurfaceProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  delay?: number;
  /**
   * mount — animate once on enter (preferred under AppShell).
   * inView — animate when scrolled into view (long pages).
   */
  mode?: "mount" | "inView";
}

/**
 * Elevated surface with enter motion + optional hover lift.
 * Opacity lives only on this node (safe under AppShell route transition).
 */
export function MotionSurface({
  interactive = true,
  delay = 0,
  mode = "mount",
  className,
  children,
}: MotionSurfaceProps) {
  const reduceMotion = useReducedMotion();

  const surfaceClass = cn(
    "surface-panel",
    interactive && "surface-panel-interactive",
    className
  );

  if (reduceMotion) {
    return <div className={surfaceClass}>{children}</div>;
  }

  return (
    <motion.div
      className={surfaceClass}
      initial={surfaceEnter.initial}
      {...(mode === "inView"
        ? {
            whileInView: surfaceEnter.animate,
            viewport: { once: true, amount: 0.12, margin: "0px 0px -24px 0px" },
          }
        : { animate: surfaceEnter.animate })}
      transition={{ ...softSpring, delay }}
      whileHover={
        interactive
          ? { y: -3, transition: snappySpring }
          : undefined
      }
      whileTap={interactive ? { scale: 0.992 } : undefined}
    >
      {children}
    </motion.div>
  );
}
