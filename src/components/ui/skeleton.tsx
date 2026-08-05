import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted/65",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent dark:before:via-white/10",
        "rtl:before:translate-x-full rtl:before:bg-gradient-to-l",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
