"use client";

import { motion, useReducedMotion } from "framer-motion";
import { pressable, snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

type PressableProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** Lighter press for dense rows / chips. */
  intensity?: "default" | "subtle";
  onClick?: () => void;
};

/**
 * Shared hover/press feedback for interactive surfaces.
 * Prefer this over ad-hoc whileHover on cards and list rows.
 */
export function Pressable({
  children,
  className,
  disabled,
  intensity = "default",
  onClick,
}: PressableProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion || disabled) {
    return (
      <div
        className={cn(disabled && "pointer-events-none opacity-55", className)}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </div>
    );
  }

  const hover =
    intensity === "subtle"
      ? { y: -1, transition: snappySpring }
      : pressable.whileHover;
  const tap =
    intensity === "subtle" ? { scale: 0.99 } : pressable.whileTap;

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      whileHover={hover}
      whileTap={tap}
      transition={pressable.transition}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
