"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { softSpring, snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className,
}: EmptyStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { y: 10, scale: 0.985 }}
      animate={{ y: 0, scale: 1 }}
      transition={softSpring}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact
          ? "px-4 py-10"
          : "rounded-2xl border border-dashed border-border/75 bg-gradient-to-b from-muted/35 via-card/50 to-card/30 px-6 py-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-none",
        className
      )}
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.88, rotate: -4 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={snappySpring}
        className={cn(
          "mb-3.5 flex items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground shadow-[var(--shadow-card)]",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </motion.div>
      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <motion.div
          className="mt-4"
          whileHover={reduceMotion ? undefined : { y: -1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <Button size={compact ? "sm" : "default"} onClick={onAction}>
            {actionLabel}
          </Button>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
