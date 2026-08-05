"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Users,
  Wallet,
  MinusCircle,
  Timer,
  ChartColumn,
  UserCheck,
} from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Badge } from "@/components/ui/badge";
import { formatEgp } from "@/lib/payroll";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollDashboardSummary } from "@/types/payroll";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<
  string,
  "info" | "warning" | "success" | "secondary"
> = {
  draft: "secondary",
  hr_review: "info",
  finance_review: "warning",
  approved: "success",
  paid: "success",
  cancelled: "secondary",
};

const CAL_KIND: Record<string, string> = {
  cutoff: "border-amber-500/40 bg-amber-500/10",
  review: "border-sky-500/40 bg-sky-500/10",
  pay: "border-emerald-500/40 bg-emerald-500/10",
  holiday: "border-rose-500/40 bg-rose-500/10",
  normal: "border-border/70 bg-muted/20",
};

export function PayrollKpiRow({
  summary,
}: {
  summary: PayrollDashboardSummary;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const loc = locale === "ar" ? "ar" : "en";

  const cards = [
    {
      key: "period",
      label: t("payroll.currentPeriod"),
      value: summary.period.label,
      icon: CalendarClock,
      numeric: false,
    },
    {
      key: "included",
      label: t("payroll.employeesIncluded"),
      value: summary.employeesIncluded,
      icon: Users,
      numeric: true,
    },
    {
      key: "processed",
      label: t("payroll.employeesProcessed"),
      value: summary.employeesProcessed,
      icon: UserCheck,
      numeric: true,
    },
    {
      key: "pending",
      label: t("payroll.pendingPayroll"),
      value: summary.pendingPayroll,
      icon: Clock3,
      numeric: true,
    },
    {
      key: "cost",
      label: t("payroll.estimatedCost"),
      value: summary.estimatedCost,
      icon: CircleDollarSign,
      numeric: true,
      money: true,
    },
    {
      key: "avg",
      label: t("payroll.averageSalary"),
      value: summary.averageSalary,
      icon: ChartColumn,
      numeric: true,
      money: true,
    },
    {
      key: "deductions",
      label: t("payroll.totalDeductions"),
      value: summary.totalDeductions,
      icon: MinusCircle,
      numeric: true,
      money: true,
    },
    {
      key: "ot",
      label: t("payroll.totalOvertime"),
      value: summary.totalOvertime,
      icon: Timer,
      numeric: true,
      money: true,
    },
    {
      key: "net",
      label: t("payroll.netPayroll"),
      value: summary.netPayroll,
      icon: Wallet,
      numeric: true,
      money: true,
    },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[summary.run.status] ?? "info"}>
          {t(`payroll.status.${summary.run.status}`)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {t("payroll.upcomingPayDate")}:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {summary.upcomingPayDate}
          </span>
        </span>
      </div>
      <motion.div
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.key}
              variants={fadeInUp}
              className="surface-panel surface-panel-interactive surface-shine p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="section-label">{card.label}</p>
                <span className="icon-well">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <p className="stat-value mt-3 text-[1.25rem] md:text-[1.4rem]">
                {"money" in card && card.money ? (
                  formatEgp(card.value as number, loc)
                ) : card.numeric ? (
                  <AnimatedCounter value={card.value as number} />
                ) : (
                  (card.value as string)
                )}
              </p>
            </motion.article>
          );
        })}
      </motion.div>

      {summary.calendar.length > 0 ? (
        <section className="surface-panel overflow-hidden">
          <div className="panel-header">
            <h3 className="text-[0.95rem] font-semibold">
              {t("payroll.payrollCalendar")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("payroll.payrollCalendarDesc")}
            </p>
          </div>
          <div className="panel-body grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {summary.calendar.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  CAL_KIND[day.kind] ?? CAL_KIND.normal
                )}
              >
                <p className="section-label">{day.label}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {day.date}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
