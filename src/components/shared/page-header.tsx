"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { fadeInUp, softSpring, staggerFast } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  showBreadcrumbs?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  showBreadcrumbs = true,
  className,
}: PageHeaderProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <header className={cn("mb-5 sm:mb-7", className)}>
        {showBreadcrumbs ? (
          <div className="mb-3.5 hidden sm:block">
            <Breadcrumbs />
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            {eyebrow ? <p className="type-eyebrow">{eyebrow}</p> : null}
            <h1 className="type-title">{title}</h1>
            {description ? (
              <p className="type-subtitle line-clamp-2 sm:line-clamp-none">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
        <div className="soft-divider mt-4 sm:mt-5" aria-hidden />
      </header>
    );
  }

  return (
    <motion.header
      variants={staggerFast}
      initial="hidden"
      animate="visible"
      className={cn("mb-5 sm:mb-7", className)}
    >
      {showBreadcrumbs ? (
        <motion.div variants={fadeInUp} className="mb-3.5 hidden sm:block">
          <Breadcrumbs />
        </motion.div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1.5 sm:space-y-2">
          {eyebrow ? (
            <motion.p variants={fadeInUp} className="type-eyebrow">
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
            className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end"
          >
            {actions}
          </motion.div>
        ) : null}
      </div>
      <motion.div
        className="soft-divider mt-4 origin-center sm:mt-5"
        aria-hidden
        inherit={false}
        initial={{ scaleX: 0.42, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ ...softSpring, delay: 0.1 }}
      />
    </motion.header>
  );
}
