import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CategoryChip({
  label,
  count,
  selected,
  onClick,
  color,
  muted = false,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  color?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
        selected
          ? "border-primary/25 bg-primary/[0.1] text-primary"
          : muted
            ? "border-border/60 bg-muted/40 text-muted-foreground"
            : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
      aria-pressed={selected}
    >
      {color ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      <span>{label}</span>
      <span className="font-mono text-[10px] opacity-80">{count}</span>
    </button>
  );
}

export function CategoryRow({
  label,
  count,
  selected,
  onClick,
  leading,
  muted = false,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  leading: ReactNode;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors",
        selected
          ? "bg-muted font-semibold text-foreground"
          : muted
            ? "text-muted-foreground/75 hover:bg-muted/40 hover:text-muted-foreground"
            : "font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
      aria-pressed={selected}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
          selected
            ? "bg-background/80 text-foreground/70"
            : "text-muted-foreground/70"
        )}
      >
        {count}
      </span>
    </button>
  );
}
