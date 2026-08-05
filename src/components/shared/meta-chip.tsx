"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetaChipProps {
  label: string;
  value: ReactNode;
  className?: string;
}

/** Small labeled meta cell for detail cards (leave, work, attendance). */
export function MetaChip({ label, value, className }: MetaChipProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border/60 bg-muted/25 px-2 py-2 sm:px-3",
        className
      )}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-medium text-foreground sm:text-[13px]">
        {value}
      </p>
    </div>
  );
}

interface SoftListRowProps {
  children: ReactNode;
  className?: string;
  active?: boolean;
  as?: "div" | "li" | "button";
  onClick?: () => void;
}

/** Consistent interactive/list row surface. */
export function SoftListRow({
  children,
  className,
  active = false,
  as = "div",
  onClick,
}: SoftListRowProps) {
  const shared = cn(
    "list-row w-full px-3.5 py-3 text-start",
    active && "list-row-active",
    className
  );

  if (as === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        data-active={active || undefined}
        className={shared}
      >
        {children}
      </button>
    );
  }

  if (as === "li") {
    return (
      <li
        onClick={onClick}
        data-active={active || undefined}
        className={shared}
      >
        {children}
      </li>
    );
  }

  return (
    <div onClick={onClick} data-active={active || undefined} className={shared}>
      {children}
    </div>
  );
}
