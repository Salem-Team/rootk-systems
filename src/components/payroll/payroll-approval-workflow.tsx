"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  advancePayrollStatus,
  cancelPayrollRun,
} from "@/services/payroll.service";
import { fadeInUp } from "@/lib/animations";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { PayrollRun, PayrollRunStatus } from "@/types/payroll";

const STEPS: PayrollRunStatus[] = [
  "draft",
  "hr_review",
  "finance_review",
  "approved",
  "paid",
];

export function PayrollApprovalWorkflow({
  run,
  canAdvance,
  onAdvanced,
}: {
  run: PayrollRun;
  canAdvance: boolean;
  onAdvanced: (next: PayrollRun) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const currentIdx = STEPS.indexOf(run.status);

  async function advance() {
    const res = await advancePayrollStatus();
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onAdvanced(res.data);
    toast.success(t("payroll.workflowAdvanced"));
  }

  async function cancel() {
    if (!window.confirm(t("payroll.cancelRunBody", { period: run.periodId }))) {
      return;
    }
    const res = await cancelPayrollRun();
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onAdvanced(res.data);
    toast.success(t("payroll.workflowCancelled"));
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.workflowTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("payroll.workflowDesc")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAdvance && run.status !== "paid" ? (
            <Button size="sm" onClick={() => void advance()}>
              {t("payroll.advanceStep")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canAdvance && run.status !== "draft" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void cancel()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("payroll.cancelRun")}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="panel-body">
        <ol className="grid gap-2 sm:grid-cols-5">
          {STEPS.map((step, idx) => {
            const done = idx <= currentIdx;
            const active = idx === currentIdx;
            return (
              <li
                key={step}
                className={cn(
                  "rounded-xl border px-3 py-3 text-center transition-colors",
                  done
                    ? "border-primary/25 bg-primary/[0.06]"
                    : "border-border/70 bg-muted/20",
                  active && "ring-2 ring-primary/20"
                )}
              >
                <span
                  className={cn(
                    "mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </span>
                <p className="text-xs font-semibold">
                  {t(`payroll.status.${step}`)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </motion.section>
  );
}
