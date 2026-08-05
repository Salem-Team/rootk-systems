"use client";

import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarRange, Clock3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  leaveNoteKey,
  leaveReasonKey,
  translateOrFallback,
} from "@/lib/i18n-content";
import { cn } from "@/lib/utils";
import type { Employee, LeaveRequest } from "@/types";

interface LeaveTimelineProps {
  requests: LeaveRequest[];
  employees?: Employee[];
  title?: string;
  description?: string;
}

export function LeaveTimeline({
  requests,
  employees = [],
  title,
  description,
}: LeaveTimelineProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const resolvedTitle = title ?? t("leave.timeline");
  const resolvedDescription = description ?? t("leave.emptyDesc");

  return (
    <Card className="transition-[box-shadow,border-color] duration-200 hover:border-primary/15 hover:shadow-[var(--shadow-card-hover)]">
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
        <CardDescription>{resolvedDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarRange}
            title={t("leave.empty")}
            description={t("leave.emptyDesc")}
          />
        ) : (
          <motion.ol
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="relative space-y-0"
          >
            <div className="absolute bottom-2 start-[19px] top-2 w-px bg-border" aria-hidden />
            {requests.map((request) => {
              const employee = employeeMap.get(request.employeeId);
              const typeLabel = t(`leaveTypes.${request.type}`);

              return (
                <motion.li
                  key={request.id}
                  variants={fadeInUp}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  <div
                    className={cn(
                      "relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-card",
                      request.status === "approved" &&
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      request.status === "pending" &&
                        "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      request.status === "rejected" &&
                        "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {employee?.name ?? "—"}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {typeLabel} ·{" "}
                          {t("leave.daysCount", { count: request.days })}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {format(parseISO(request.startDate), "MMM d, yyyy", {
                        locale: dateLocale,
                      })}
                      {request.startDate !== request.endDate
                        ? ` – ${format(parseISO(request.endDate), "MMM d, yyyy", {
                            locale: dateLocale,
                          })}`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">
                      {translateOrFallback(
                        t,
                        leaveReasonKey(request.id),
                        request.reason
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {format(parseISO(request.submittedAt), "MMM d · h:mm a", {
                          locale: dateLocale,
                        })}
                      </span>
                      {request.reviewedAt ? (
                        <span>
                          {format(parseISO(request.reviewedAt), "MMM d · h:mm a", {
                            locale: dateLocale,
                          })}
                        </span>
                      ) : null}
                    </div>
                    {request.reviewerNote ? (
                      <p className="mt-2 rounded-xl bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                        {t("leave.reviewerNote")}:{" "}
                        {translateOrFallback(
                          t,
                          leaveNoteKey(request.id),
                          request.reviewerNote
                        )}
                      </p>
                    ) : null}
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </CardContent>
    </Card>
  );
}
