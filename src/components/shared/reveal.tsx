"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  fadeInUp,
  revealViewport,
  scaleInSoft,
  slideInLeft,
  slideInRight,
} from "@/lib/animations";
import { cn } from "@/lib/utils";

type RevealPreset = "up" | "scale" | "left" | "right";

const PRESETS = {
  up: fadeInUp,
  scale: scaleInSoft,
  left: slideInLeft,
  right: slideInRight,
} as const;

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  preset?: RevealPreset;
  delay?: number;
  /** When false, animates on mount instead of viewport. */
  inView?: boolean;
}

export function Reveal({
  children,
  className,
  preset = "up",
  delay = 0,
  inView = true,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const variants = PRESETS[preset];

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      variants={variants}
      initial="hidden"
      {...(inView
        ? { whileInView: "visible" as const, viewport: revealViewport }
        : { animate: "visible" as const })}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
