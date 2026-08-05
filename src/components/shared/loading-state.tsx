"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeInUp, staggerFast } from "@/lib/animations";
import { useTranslation } from "@/hooks/use-translation";

export function PageSkeleton() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const body = (
    <>
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
    </>
  );

  if (reduceMotion) {
    return (
      <div
        className="page-stack"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{t("common.loading")}</span>
        {body}
      </div>
    );
  }

  return (
    <motion.div
      className="page-stack"
      role="status"
      aria-busy="true"
      aria-live="polite"
      variants={staggerFast}
      initial="hidden"
      animate="visible"
    >
      <span className="sr-only">{t("common.loading")}</span>
      <motion.div variants={fadeInUp} className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </motion.div>
      <motion.div
        variants={fadeInUp}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </motion.div>
      <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </motion.div>
    </motion.div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
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

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-busy="true"
      variants={staggerFast}
      initial="hidden"
      animate="visible"
    >
      <span className="sr-only">{t("common.loading")}</span>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={fadeInUp}>
          <Skeleton className="h-44 rounded-xl" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

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
      <motion.div
        className="space-y-2 p-3"
        variants={reduceMotion ? undefined : staggerFast}
        initial={reduceMotion ? undefined : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
      >
        {Array.from({ length: rows }).map((_, i) => {
          const row = (
            <div className="list-row flex items-center gap-3 px-3.5 py-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
            </div>
          );
          return reduceMotion ? (
            <div key={i}>{row}</div>
          ) : (
            <motion.div key={i} variants={fadeInUp}>
              {row}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
