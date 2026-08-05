"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { softSpring, snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = AlertTriangle,
  className,
}: ErrorStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={softSpring}
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-gradient-to-b from-rose-500/[0.06] to-card/40 px-6 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] dark:shadow-none",
        className
      )}
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.88 }}
        animate={{ scale: 1 }}
        transition={snappySpring}
        className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/25 bg-card text-rose-600 shadow-sm dark:text-rose-400"
      >
        <Icon className="h-5 w-5" aria-hidden />
      </motion.div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </motion.div>
  );
}
