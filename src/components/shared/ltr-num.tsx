import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Keep a phone, range, or date reading left-to-right inside Arabic UI. */
export function LtrNum({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <bdi dir="ltr" title={title} className={cn(className)}>
      {children}
    </bdi>
  );
}
