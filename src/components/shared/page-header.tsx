"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { fadeInUp, softSpring, staggerFast } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Primary CTA shown full-width under the title on small screens. */
  mobileActions?: React.ReactNode;
  /** Optional class for the mobile actions row (overrides default wrap styles). */
  mobileActionsClassName?: string;
  eyebrow?: string;
  showBreadcrumbs?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  mobileActions,
  mobileActionsClassName,
  eyebrow,
  showBreadcrumbs = true,
  className,
}: PageHeaderProps) {
  const reduceMotion = useReducedMotion();
  const mobileSlot = mobileActions ?? actions;
  const mobileRowClass = cn(
    "mt-3 flex w-full flex-wrap gap-2 sm:hidden [&_a]:min-h-11 [&_a]:touch-manipulation [&_button]:min-h-11 [&_button]:touch-manipulation",
    mobileActionsClassName ??
      "[&_a]:flex-1 [&_button]:min-w-[calc(50%-0.25rem)] [&_button]:flex-1"
  );

  const body = (
    <>
      {showBreadcrumbs ? (
        <div className="mb-3.5 hidden sm:block">
          <Breadcrumbs />
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1 sm:space-y-2">
          {eyebrow ? (
            <p className="type-eyebrow hidden sm:block">{eyebrow}</p>
          ) : null}
          <h1 className="type-title">{title}</h1>
          {description ? (
            <p className="type-subtitle line-clamp-2 sm:line-clamp-none">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="hidden w-full flex-wrap items-center gap-2 sm:flex sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {mobileSlot ? (
        <div className={mobileRowClass}>{mobileSlot}</div>
      ) : null}
      <div
        className="soft-divider mt-3.5 hidden sm:mt-5 sm:block"
        aria-hidden
      />
    </>
  );

  if (reduceMotion) {
    return <header className={cn("mb-4 sm:mb-7", className)}>{body}</header>;
  }

  return (
    <motion.header
      variants={staggerFast}
      initial="hidden"
      animate="visible"
      className={cn("mb-4 sm:mb-7", className)}
    >
      {showBreadcrumbs ? (
        <motion.div variants={fadeInUp} className="mb-3.5 hidden sm:block">
          <Breadcrumbs />
        </motion.div>
      ) : null}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1 sm:space-y-2">
          {eyebrow ? (
            <motion.p
              variants={fadeInUp}
              className="type-eyebrow hidden sm:block"
            >
              {eyebrow}
            </motion.p>
          ) : null}
          <motion.h1 variants={fadeInUp} className="type-title">
            {title}
          </motion.h1>
          {description ? (
            <motion.p
              variants={fadeInUp}
              className="type-subtitle line-clamp-2 sm:line-clamp-none"
            >
              {description}
            </motion.p>
          ) : null}
        </div>
        {actions ? (
          <motion.div
            variants={fadeInUp}
            className="hidden w-full flex-wrap items-center gap-2 sm:flex sm:w-auto sm:justify-end"
          >
            {actions}
          </motion.div>
        ) : null}
      </div>
      {mobileSlot ? (
        <motion.div variants={fadeInUp} className={mobileRowClass}>
          {mobileSlot}
        </motion.div>
      ) : null}
      <motion.div
        className="soft-divider mt-3.5 origin-center hidden sm:mt-5 sm:block"
        aria-hidden
        inherit={false}
        initial={{ scaleX: 0.42, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ ...softSpring, delay: 0.1 }}
      />
    </motion.header>
  );
}
