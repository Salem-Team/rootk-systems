import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return (
    <div
      className={cn(
        "ui-enter-scale flex flex-col items-center justify-center text-center",
        compact
          ? "px-4 py-10"
          : "rounded-2xl border border-dashed border-border/75 bg-gradient-to-b from-muted/35 via-card/50 to-card/30 px-6 py-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-none",
        className
      )}
    >
      <div
        className={cn(
          "icon-well mb-3.5 text-muted-foreground",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>
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
        <div className="mt-4">
          <Button size={compact ? "sm" : "default"} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
