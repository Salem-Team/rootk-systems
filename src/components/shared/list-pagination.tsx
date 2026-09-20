"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import {
  LIST_PAGE_SIZE_OPTIONS,
  pageWindow,
  type ListPageSize,
} from "@/lib/list-pagination";
import { cn } from "@/lib/utils";

export function ListPagination({
  page,
  totalPages,
  total,
  from,
  to,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  pageSize: ListPageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: ListPageSize) => void;
  className?: string;
}) {
  const { t, isRtl } = useTranslation();
  if (total === 0) return null;

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const windowPages = pageWindow(page, totalPages);
  const showNav = totalPages > 1;

  return (
    <nav
      aria-label={t("common.pagination.label")}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 px-3 py-3 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:px-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p className="text-[12px] text-muted-foreground sm:text-[13px]">
          {t("common.pagination.showing", {
            from: String(from),
            to: String(to),
            total: String(total),
          })}
        </p>
        {onPageSizeChange ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {t("common.pagination.perPage")}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) =>
                onPageSizeChange(Number(v) as ListPageSize)
              }
            >
              <SelectTrigger
                aria-label={t("common.pagination.perPage")}
                className="h-9 w-[4.75rem] rounded-xl text-[12px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIST_PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {showNav ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 min-w-10 touch-manipulation rounded-xl px-2.5 sm:h-9"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t("common.pagination.prev")}
          >
            <PrevIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t("common.pagination.prev")}</span>
          </Button>

          <div className="flex flex-wrap items-center gap-1">
            {windowPages.map((entry, index) =>
              entry === "ellipsis" ? (
                <span
                  key={`e-${index}`}
                  className="px-1.5 text-[12px] text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={entry}
                  type="button"
                  size="sm"
                  variant={entry === page ? "default" : "outline"}
                  className={cn(
                    "h-10 min-w-10 touch-manipulation rounded-xl px-0 font-mono text-[12px] tabular-nums sm:h-9",
                    entry === page && "shadow-sm"
                  )}
                  aria-current={entry === page ? "page" : undefined}
                  onClick={() => onPageChange(entry)}
                >
                  {entry}
                </Button>
              )
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 min-w-10 touch-manipulation rounded-xl px-2.5 sm:h-9"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t("common.pagination.next")}
          >
            <span className="hidden sm:inline">{t("common.pagination.next")}</span>
            <NextIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
