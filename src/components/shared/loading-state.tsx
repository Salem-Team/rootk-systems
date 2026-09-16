"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";

export function PageSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="page-stack"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t("common.loading")}</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  const { t } = useTranslation();

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">{t("common.loading")}</span>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  const { t } = useTranslation();

  return (
    <div
      className="surface-panel overflow-hidden"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">{t("common.loading")}</span>
      <div className="panel-header">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="list-row flex items-center gap-3 px-3.5 py-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact form / settings panel skeleton. */
export function FormSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="mx-auto max-w-2xl space-y-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t("common.loading")}</span>
      <div className="surface-panel overflow-hidden">
        <div className="panel-header space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <div className="panel-body grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

/** Master-detail / hub list skeleton. */
export function HubSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="grid gap-4 lg:grid-cols-[minmax(16.5rem,19rem)_minmax(0,1fr)]"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t("common.loading")}</span>
      <div className="surface-panel overflow-hidden">
        <div className="panel-header space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="list-row flex items-center gap-3 px-3 py-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-40 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface-panel hidden overflow-hidden lg:block">
        <div className="panel-header space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="panel-body space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
