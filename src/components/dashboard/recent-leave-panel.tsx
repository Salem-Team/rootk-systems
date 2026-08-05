"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { LeaveRequest } from "@/types";

export function RecentLeavePanel({ requests }: { requests: LeaveRequest[] }) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const items = requests.slice(0, 5);

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="recent-leave-heading"
    >
      <div className="panel-header flex items-center justify-between gap-3">
        <div>
          <h3
            id="recent-leave-heading"
            className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight"
          >
            <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("dashboard.recentLeaveRequests")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("dashboard.recentLeaveRequestsDesc")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/leave">{t("leave.title")}</Link>
        </Button>
      </div>
      <div className="panel-body">
        {items.length === 0 ? (
          <EmptyState
            compact
            title={t("leave.empty")}
            description={t("leave.description")}
          />
        ) : (
          <motion.ul
            variants={staggerContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            className="space-y-2"
          >
            {items.map((leave) => (
              <motion.li
                key={leave.id}
                variants={fadeInUp}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {t(`leaveTypes.${leave.type}`)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(parseISO(leave.startDate), "MMM d", {
                      locale: dateLocale,
                    })}
                    {leave.endDate !== leave.startDate
                      ? ` – ${format(parseISO(leave.endDate), "MMM d", {
                          locale: dateLocale,
                        })}`
                      : ""}{" "}
                    · {t("leave.daysCount", { count: leave.days })}
                  </p>
                </div>
                <StatusBadge status={leave.status} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </motion.section>
  );
}
