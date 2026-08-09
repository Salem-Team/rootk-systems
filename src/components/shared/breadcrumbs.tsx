"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { APP_NAV } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t, isRtl } = useTranslation();
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const navItem = APP_NAV.find((item) => item.href === `/${segment}`);
  const labelKey = (
    segment === "profile"
      ? "nav.profile"
      : navItem
        ? `nav.${navItem.key}`
        : "nav.dashboard"
  ) as TranslationPath;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "mb-2 flex items-center gap-1 text-[11px] text-muted-foreground",
        className
      )}
    >
      <Link
        href="/dashboard"
        className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted/80 hover:text-foreground"
      >
        {t("app.short")}
      </Link>
      <Chevron className="h-3 w-3 opacity-40" aria-hidden />
      <span className="rounded-md border border-border/60 bg-muted/45 px-1.5 py-0.5 font-medium text-foreground/85">
        {t(labelKey)}
      </span>
    </nav>
  );
}
