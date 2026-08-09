import type { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function PolicyRow({
  title,
  desc,
  checked,
  onCheckedChange,
  icon: Icon,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: typeof Bell;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  );
}
