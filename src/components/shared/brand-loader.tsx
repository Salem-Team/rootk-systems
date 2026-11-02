"use client";

import Image from "next/image";
import { APP_SHORT, LOGO_SRC } from "@/constants";
import { cn } from "@/lib/utils";

type BrandLoaderVariant = "app" | "dark";

export function BrandLoader({
  variant = "app",
  label,
  className,
  fullScreen = true,
}: {
  variant?: BrandLoaderVariant;
  /** Optional status line under the wordmark */
  label?: string;
  className?: string;
  fullScreen?: boolean;
}) {
  const dark = variant === "dark";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? APP_SHORT}
      className={cn(
        "relative flex flex-col items-center justify-center gap-5",
        fullScreen &&
          "min-h-dvh w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        dark ? "bg-[#020814] text-white" : "bg-background text-foreground",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden",
          !fullScreen && "hidden"
        )}
        aria-hidden
      >
        <div
          className={cn(
            "brand-loader-glow absolute left-1/2 top-[42%] h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
            dark ? "bg-[#1e4bb8]/28" : "bg-primary/18"
          )}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center sm:h-24 sm:w-24">
          <span
            className="brand-loader-ring absolute inset-0 rounded-full border border-transparent"
            aria-hidden
          />
          <span
            className="brand-loader-ring brand-loader-ring-delay absolute inset-[-6px] rounded-full border border-transparent"
            aria-hidden
          />

          <div
            className={cn(
              "brand-loader-mark relative z-10 flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-[1.15rem] border shadow-[0_18px_40px_rgba(8,40,104,0.28)] sm:h-[4.75rem] sm:w-[4.75rem] sm:rounded-[1.25rem]",
              dark
                ? "border-white/25 bg-white ring-1 ring-white/15"
                : "border-border/70 bg-card ring-1 ring-primary/10"
            )}
          >
            <div className="brand-loader-sheen absolute inset-0" aria-hidden />
            <Image
              src={LOGO_SRC}
              alt={APP_SHORT}
              width={76}
              height={76}
              priority
              className="relative z-[1] h-[78%] w-[78%] object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <p
            className={cn(
              "brand-loader-wordmark text-[13px] font-bold tracking-[0.28em]",
              dark ? "text-white" : "text-foreground"
            )}
          >
            {APP_SHORT}
          </p>

          <div
            className={cn(
              "brand-loader-bar h-[2px] w-16 overflow-hidden rounded-full",
              dark ? "bg-white/15" : "bg-muted"
            )}
            aria-hidden
          >
            <span
              className={cn(
                "brand-loader-bar-fill block h-full w-1/2 rounded-full",
                dark ? "bg-white" : "bg-primary"
              )}
            />
          </div>

          {label ? (
            <p
              className={cn(
                "text-[11px] tracking-wide",
                dark ? "text-[#8aa0c0]" : "text-muted-foreground"
              )}
            >
              {label}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
