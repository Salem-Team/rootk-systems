"use client";

import Image from "next/image";
import { LOGO_SRC } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  collapsed?: boolean;
  className?: string;
  showWordmark?: boolean;
  variant?: "sidebar" | "light";
}

export function BrandMark({
  collapsed = false,
  className,
  showWordmark = true,
  variant = "sidebar",
}: BrandMarkProps) {
  const { t } = useTranslation();
  const light = variant === "light";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border shadow-sm",
          light
            ? "border-border/70 bg-white dark:bg-card"
            : "border-white/14 bg-white ring-1 ring-white/10"
        )}
      >
        <Image
          src={LOGO_SRC}
          alt={t("app.name")}
          width={36}
          height={36}
          className="h-full w-full object-contain p-0.5"
          priority
        />
      </div>
      {showWordmark && !collapsed ? (
        <p
          className={cn(
            "truncate text-[14px] font-bold tracking-tight",
            light ? "text-foreground" : "text-white"
          )}
        >
          {t("app.short")}
        </p>
      ) : null}
    </div>
  );
}
