import { cn } from "@/lib/utils";

/** Percent label that stays `12%` (never `%12`) in RTL layouts. */
export function PercentValue({
  value,
  className,
  suffixClassName,
  decimals = 0,
}: {
  value: number;
  className?: string;
  suffixClassName?: string;
  decimals?: number;
}) {
  const shown =
    decimals > 0 ? Number(value).toFixed(decimals) : String(Math.round(value));
  return (
    <span dir="ltr" className={cn("tabular-nums", className)}>
      {shown}
      <span className={cn("opacity-60", suffixClassName)}>%</span>
    </span>
  );
}
