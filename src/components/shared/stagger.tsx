"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  fadeInUp,
  listItemIn,
  riseIn,
  staggerContainer,
  staggerDense,
  staggerFast,
  staggerSlow,
} from "@/lib/animations";
import { cn } from "@/lib/utils";

type Speed = "fast" | "base" | "slow" | "dense";

const SPEED: Record<Speed, typeof staggerContainer> = {
  fast: staggerFast,
  base: staggerContainer,
  slow: staggerSlow,
  dense: staggerDense,
};

interface StaggerRootProps {
  speed?: Speed;
  className?: string;
  children: React.ReactNode;
  role?: string;
  "aria-label"?: string;
}

/**
 * Shared stagger parent — use with StaggerItem children.
 * Container never carries opacity (safe under AppShell route transition).
 */
export function StaggerRoot({
  speed = "base",
  className,
  children,
  role,
  "aria-label": ariaLabel,
}: StaggerRootProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} role={role} aria-label={ariaLabel}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={SPEED[speed]}
      initial="hidden"
      animate="visible"
      className={className}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  preset?: "fade" | "rise" | "list";
  className?: string;
  children: React.ReactNode;
  role?: string;
}

export function StaggerItem({
  preset = "rise",
  className,
  children,
  role,
}: StaggerItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} role={role}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={
        preset === "fade"
          ? fadeInUp
          : preset === "list"
            ? listItemIn
            : riseIn
      }
      className={cn(className)}
      role={role}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({
  speed = "base",
  className,
  children,
  "aria-label": ariaLabel,
}: StaggerRootProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <ul className={className} aria-label={ariaLabel}>
        {children}
      </ul>
    );
  }

  return (
    <motion.ul
      variants={SPEED[speed]}
      initial="hidden"
      animate="visible"
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerListItem({
  preset = "rise",
  className,
  children,
}: StaggerItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <li className={className}>{children}</li>;
  }

  return (
    <motion.li
      variants={
        preset === "fade"
          ? fadeInUp
          : preset === "list"
            ? listItemIn
            : riseIn
      }
      className={className}
    >
      {children}
    </motion.li>
  );
}
