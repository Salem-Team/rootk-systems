"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  cardHover,
  easeOutExpo,
  listItemIn,
  snappySpring,
  softSpring,
  staggerFast,
} from "@/lib/animations";
import { cn } from "@/lib/utils";

/** Staggered list shell for mobile work/target cards. */
export function WorkMotionList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <ul className={className}>{children}</ul>;
  return (
    <motion.ul
      variants={staggerFast}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.ul>
  );
}

export function WorkMotionCard({
  className,
  children,
  selected,
}: {
  className?: string;
  children: ReactNode;
  selected?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <li
        className={cn(
          "rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-card)]",
          selected
            ? "border-primary/40 ring-2 ring-primary/15"
            : "border-border/70",
          className
        )}
      >
        {children}
      </li>
    );
  }

  return (
    <motion.li
      variants={listItemIn}
      layout
      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } }}
      whileHover={cardHover.hover}
      whileTap={cardHover.tap}
      className={cn(
        "rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-card)] will-change-transform",
        "transition-[border-color,box-shadow] duration-200",
        selected
          ? "border-primary/45 shadow-[0_10px_28px_-16px_hsl(var(--primary)/0.55)] ring-2 ring-primary/15"
          : "border-border/70 hover:border-border hover:shadow-[0_12px_32px_-18px_rgba(15,23,42,0.28)]",
        className
      )}
    >
      {children}
    </motion.li>
  );
}

/** Desktop table shell with a soft reveal. */
export function WorkMotionTableShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ y: 10, scale: 0.992, opacity: 0.01 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ duration: 0.42, ease: easeOutExpo }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function WorkMotionRow({
  className,
  children,
  selected,
  index = 0,
  striped = false,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  selected?: boolean;
  index?: number;
  striped?: boolean;
  onClick?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const zebra =
    striped && !selected && index % 2 === 1 ? "bg-muted/25" : undefined;
  const rowClass = cn(
    "border-b border-border/50 last:border-0 transition-colors",
    selected ? "bg-primary/[0.05]" : "hover:bg-muted/40",
    zebra,
    onClick && "cursor-pointer",
    className
  );

  if (reduceMotion) {
    return (
      <tr
        className={rowClass}
        onClick={onClick}
        data-state={selected ? "selected" : undefined}
      >
        {children}
      </tr>
    );
  }

  return (
    <motion.tr
      initial={{ y: 6, opacity: 0.01 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.28,
        ease: easeOutExpo,
        delay: Math.min(index * 0.03, 0.24),
      }}
      className={rowClass}
      onClick={onClick}
      data-state={selected ? "selected" : undefined}
    >
      {children}
    </motion.tr>
  );
}

/** Emerald Done CTA with a soft pulse when actionable. */
export function WorkDoneButtonMotion({
  children,
  className,
  disabled,
  pulse,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pulse?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion || disabled || !pulse) {
    return <span className={className}>{children}</span>;
  }
  return (
    <motion.span
      className={cn("inline-flex", className)}
      animate={{
        boxShadow: [
          "0 0 0 0 hsl(var(--primary) / 0)",
          "0 0 0 6px hsl(var(--primary) / 0.12)",
          "0 0 0 0 hsl(var(--primary) / 0)",
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      style={{ borderRadius: 999 }}
    >
      {children}
    </motion.span>
  );
}

export function WorkStatusDot({
  status,
  className,
}: {
  status: "todo" | "in_progress" | "completed";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const tone =
    status === "completed"
      ? "bg-emerald-500"
      : status === "in_progress"
        ? "bg-sky-500"
        : "bg-muted-foreground/45";

  if (reduceMotion || status !== "in_progress") {
    return (
      <span
        className={cn("inline-block h-2 w-2 rounded-full", tone, className)}
      />
    );
  }

  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      <motion.span
        className="absolute inset-0 rounded-full bg-sky-400/50"
        animate={{ scale: [1, 2.1], opacity: [0.55, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
      />
      <span className={cn("relative h-2 w-2 rounded-full", tone)} />
    </span>
  );
}

export function WorkProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted/80",
        className
      )}
    >
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-500"
        initial={reduceMotion ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduceMotion ? { duration: 0 } : softSpring}
      />
    </div>
  );
}

export function WorkIconPop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={cn("inline-flex", className)}
      whileHover={{ scale: 1.08, rotate: -4 }}
      whileTap={{ scale: 0.94 }}
      transition={snappySpring}
    >
      {children}
    </motion.span>
  );
}
