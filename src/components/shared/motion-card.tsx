"use client";

import { motion, useReducedMotion } from "framer-motion";
import { softSpring, snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  interactive?: boolean;
}

/**
 * Card wrapper with mount enter + hover lift.
 * Prefer over bare Card when the surface is selectable.
 */
export function MotionCard({
  children,
  className,
  delay = 0,
  interactive = true,
}: MotionCardProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      initial={{ y: 12, scale: 0.985 }}
      animate={{ y: 0, scale: 1 }}
      transition={{ ...softSpring, delay }}
      whileHover={
        interactive ? { y: -4, transition: snappySpring } : undefined
      }
      whileTap={interactive ? { scale: 0.985 } : undefined}
    >
      {children}
    </motion.div>
  );
}
