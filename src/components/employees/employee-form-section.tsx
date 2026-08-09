"use client";

import { motion, useReducedMotion } from "framer-motion";
import { softSpring } from "@/lib/animations";
import type { UserRound } from "lucide-react";

export function FormSection({
  step,
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
}: {
  step: number;
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softSpring, delay }}
      className="rounded-2xl border border-border/70 bg-gradient-to-b from-muted/25 via-card to-card p-4"
    >
      <div className="mb-3.5 flex items-start gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
          <Icon className="h-3.5 w-3.5" />
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {step}
          </span>
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </motion.section>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive">{message}</p>;
}
