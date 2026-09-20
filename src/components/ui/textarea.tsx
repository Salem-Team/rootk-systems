import * as React from "react";
import { resolveTextDir } from "@/components/shared/bidi-text";
import { cn } from "@/lib/utils";

function dirFromValue(
  value: React.ComponentProps<"textarea">["value"] | React.ComponentProps<"textarea">["defaultValue"]
): "rtl" | "ltr" | "auto" {
  if (typeof value !== "string" || !value) return "auto";
  return resolveTextDir(value);
}

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, dir, value, defaultValue, ...props }, ref) => {
  const resolvedDir = dir ?? dirFromValue(value ?? defaultValue);
  return (
    <textarea
      dir={resolvedDir}
      value={value}
      defaultValue={defaultValue}
      className={cn(
        "bidi-plain flex min-h-[96px] w-full rounded-lg border border-border/85 bg-card px-3 py-2.5 text-sm shadow-[0_1px_2px_rgba(11,20,36,0.03)] transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground/55 hover:border-border focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/18 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-55",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
