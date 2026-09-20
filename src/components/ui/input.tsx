import * as React from "react";
import { resolveTextDir } from "@/components/shared/bidi-text";
import { cn } from "@/lib/utils";

const LTR_INPUT_TYPES = new Set([
  "email",
  "url",
  "tel",
  "number",
  "password",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, dir, value, defaultValue, ...props }, ref) => {
    const fromValue =
      typeof value === "string" && value
        ? resolveTextDir(value)
        : typeof defaultValue === "string" && defaultValue
          ? resolveTextDir(defaultValue)
          : "auto";
    const resolvedDir =
      dir ?? (type && LTR_INPUT_TYPES.has(type) ? "ltr" : fromValue);
    return (
      <input
        type={type}
        dir={resolvedDir}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "bidi-plain flex h-9 w-full rounded-lg border border-border/85 bg-card px-3 py-2 text-sm shadow-[0_1px_2px_rgba(11,20,36,0.03)] transition-[border-color,box-shadow,background-color] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/55 hover:border-border focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/18 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-55",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
