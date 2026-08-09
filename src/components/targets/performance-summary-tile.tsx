import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex min-h-[5.25rem] items-center gap-3.5 rounded-2xl border border-border/60 bg-card px-4 py-4 sm:px-5">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tone ?? "bg-muted/50"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}
