"use client";

import { useEffect, useState } from "react";
import { ar as arLocale, enUS } from "date-fns/locale";
import { toast } from "sonner";
import {
  advancePayrollStatus,
  cancelPayrollRun,
  listPayrollRuns,
} from "@/services/payroll.service";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  PayrollDashboardSummary,
  PayrollRun,
} from "@/types/payroll";
import { PayrollCancelRunDialog, PayrollRunsHistory } from "./payroll-ledger-history";
import { PayrollLedgerSummary } from "./payroll-ledger-summary";
import { PayrollLedgerTable } from "./payroll-ledger-table";

export function PayrollLedgerPanel({
  summary,
  payslips,
  employees,
  canAdvance,
  onRunUpdated,
  onRefreshPayslips,
}: {
  summary: PayrollDashboardSummary;
  payslips: EmployeePayslip[];
  employees: Employee[];
  canAdvance: boolean;
  onRunUpdated: (run: PayrollRun) => void;
  onRefreshPayslips: () => void;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const loc = locale === "ar" ? "ar" : "en";
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void listPayrollRuns().then((res) => {
      if (!mounted) return;
      if (res.success) setRuns(res.data);
    });
    return () => {
      mounted = false;
    };
  }, [summary.run.status, summary.run.updatedAt]);

  const canCancel =
    canAdvance &&
    (summary.run.status !== "draft" || payslips.length > 0);

  async function advance() {
    setBusy(true);
    const res = await advancePayrollStatus();
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onRunUpdated(res.data);
    onRefreshPayslips();
    setRuns((prev) => {
      const others = prev.filter((r) => r.periodId !== res.data.periodId);
      return [res.data, ...others];
    });
    toast.success(t("payroll.workflowAdvanced"));
  }

  async function cancelRun() {
    setBusy(true);
    const res = await cancelPayrollRun();
    setBusy(false);
    setConfirmCancelOpen(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    onRunUpdated(res.data);
    onRefreshPayslips();
    setRuns((prev) => {
      const others = prev.filter((r) => r.periodId !== res.data.periodId);
      return [res.data, ...others];
    });
    toast.success(t("payroll.workflowCancelled"));
  }

  return (
    <div className="space-y-4">
      <PayrollLedgerSummary
        summary={summary}
        loc={loc}
        canAdvance={canAdvance}
        canCancel={canCancel}
        busy={busy}
        onAdvance={() => void advance()}
        onRequestCancel={() => setConfirmCancelOpen(true)}
      />

      <PayrollLedgerTable payslips={payslips} employees={employees} loc={loc} />

      <PayrollRunsHistory runs={runs} dateLocale={dateLocale} loc={loc} />

      <PayrollCancelRunDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        summary={summary}
        busy={busy}
        onConfirm={() => void cancelRun()}
      />
    </div>
  );
}
