"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { EmployeePayslip } from "@/types/payroll";

export function SalaryBreakdown({ payslip }: { payslip: EmployeePayslip }) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const loc = locale === "ar" ? "ar" : "en";

  const summary = [
    { key: "gross", label: t("payroll.gross"), value: payslip.gross, tone: "text-foreground" },
    {
      key: "allow",
      label: t("payroll.allowances"),
      value: payslip.allowancesTotal,
      tone: "text-sky-700 dark:text-sky-300",
    },
    {
      key: "bonus",
      label: t("payroll.bonuses"),
      value: payslip.bonusesTotal,
      tone: "text-emerald-700 dark:text-emerald-300",
    },
    {
      key: "incentive",
      label: t("payroll.incentives"),
      value: payslip.incentives,
      tone: "text-teal-700 dark:text-teal-300",
    },
    {
      key: "ot",
      label: t("payroll.overtime"),
      value: payslip.overtimePay,
      tone: "text-cyan-700 dark:text-cyan-300",
    },
    {
      key: "ded",
      label: t("payroll.deductions"),
      value: payslip.deductionsTotal,
      tone: "text-rose-700 dark:text-rose-300",
    },
    {
      key: "employeeCost",
      label: t("payroll.employeeCost"),
      value: payslip.employeeCost,
      tone: "text-amber-700 dark:text-amber-300",
    },
    {
      key: "employerCost",
      label: t("payroll.employerCost"),
      value: payslip.employerCost,
      tone: "text-indigo-700 dark:text-indigo-300",
    },
    {
      key: "net",
      label: t("payroll.netSalary"),
      value: payslip.net,
      tone: "text-primary",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <motion.div
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {summary.map((item) => (
          <motion.article
            key={item.key}
            variants={fadeInUp}
            className="surface-panel surface-shine p-4"
          >
            <p className="section-label">{item.label}</p>
            <p className={cn("stat-value mt-2 text-[1.35rem]", item.tone)}>
              {formatEgp(item.value, loc)}
            </p>
            <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
              <AnimatedCounter value={item.value} /> {payslip.currency}
            </p>
          </motion.article>
        ))}
      </motion.div>

      <section
        className="surface-panel overflow-hidden"
        aria-labelledby="payslip-lines-heading"
      >
        <div className="panel-header">
          <h3
            id="payslip-lines-heading"
            className="text-[0.95rem] font-semibold"
          >
            {t("payroll.breakdownTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("payroll.breakdownDesc")}
          </p>
        </div>
        <ul className="divide-y divide-border/60">
          {payslip.lines.map((line, i) => (
            <li
              key={line.id || `${line.code}-${i}`}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{line.label}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {line.code} · {line.category}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 tabular-nums font-semibold",
                  line.amount < 0
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-foreground"
                )}
              >
                {formatEgp(line.amount, loc)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
