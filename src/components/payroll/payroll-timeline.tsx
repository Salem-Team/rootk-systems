"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { PayrollTimelineEvent } from "@/types/payroll";

export function PayrollTimeline({
  events,
}: {
  events: PayrollTimelineEvent[];
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="payroll-timeline-heading"
    >
      <div className="panel-header">
        <h3
          id="payroll-timeline-heading"
          className="text-[0.95rem] font-semibold tracking-tight"
        >
          {t("payroll.timelineTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("payroll.timelineDesc")}
        </p>
      </div>
      <div className="panel-body">
        <motion.ol
          variants={staggerContainer}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          className="relative space-y-0 border-s border-border/70 ms-2"
        >
          {events.map((event) => (
            <motion.li
              key={event.id}
              variants={fadeInUp}
              className="relative ps-6 pb-5 last:pb-0"
            >
              <span
                aria-hidden
                className="absolute start-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card"
              />
              <p className="text-sm font-semibold tracking-tight">
                {event.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {event.description}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <time dateTime={event.at} className="tabular-nums">
                  {event.at.slice(0, 16).replace("T", " ")}
                </time>
                {typeof event.amount === "number" ? (
                  <span className={cn("font-semibold text-foreground")}>
                    {formatEgp(event.amount, locale === "ar" ? "ar" : "en")}
                  </span>
                ) : null}
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </motion.section>
  );
}
