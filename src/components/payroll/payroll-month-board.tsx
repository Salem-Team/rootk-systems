"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PayrollDeductionWhy } from "@/components/payroll/payroll-deduction-why";
import {
  calculatePayrollPeriod,
  getPayrollPeriodPreview,
} from "@/services/payroll.service";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type {
  EmployeePayslip,
  PayrollPeriodPreview,
} from "@/types/payroll";

function shiftPeriod(periodId: string, delta: number): string {
  const [y, m] = periodId.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(periodId: string, locale: string) {
  const [y, m] = periodId.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, 1)));
  } catch {
    return periodId;
  }
}

export function PayrollMonthBoard({
  periodId,
  onPeriodIdChange,
  reloadNonce = 0,
  employees,
  selectedEmployeeId,
  onSelectedEmployeeIdChange,
  onPayslipsChange,
  onEditSalary,
  canCalculate,
  canEditSalary,
}: {
  periodId: string;
  onPeriodIdChange: (periodId: string) => void;
  reloadNonce?: number;
  employees: Employee[];
  selectedEmployeeId: string;
  onSelectedEmployeeIdChange: (id: string) => void;
  onPayslipsChange: (payslips: EmployeePayslip[]) => void;
  onEditSalary: (employeeId: string) => void;
  canCalculate: boolean;
  canEditSalary: boolean;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const [preview, setPreview] = useState<PayrollPeriodPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void getPayrollPeriodPreview(periodId).then((res) => {
      if (!mounted) return;
      if (res.success && res.data) {
        setPreview(res.data);
        onPayslipsChange(res.data.payslips);
      } else {
        setPreview(null);
        onPayslipsChange([]);
        if (!res.success) toast.error(res.message ?? t("common.error"));
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
    // onPayslipsChange is stable enough from parent setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId, reloadNonce]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = preview?.payslips ?? [];
    if (!q) return list;
    return list.filter((s) => {
      const emp = employees.find((e) => e.id === s.employeeId);
      const hay = [
        emp?.name,
        s.employeeName,
        emp?.employeeId,
        s.employeeCode,
        emp?.department,
        s.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [preview, employees, query]);

  async function recalc() {
    if (!canCalculate || preview?.locked) return;
    setBusy(true);
    const res = await calculatePayrollPeriod(periodId);
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setPreview(res.data);
    onPayslipsChange(res.data.payslips);
    toast.success(t("payroll.monthRecalculated"));
  }

  const totals = preview?.totals;

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label={t("payroll.prevMonth")}
              onClick={() => onPeriodIdChange(shiftPeriod(periodId, -1))}
              disabled={busy}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <div className="min-w-[9.5rem] text-center">
              <p className="text-[15px] font-semibold tracking-tight">
                {periodLabel(periodId, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground">{periodId}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label={t("payroll.nextMonth")}
              onClick={() => onPeriodIdChange(shiftPeriod(periodId, 1))}
              disabled={busy}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {preview ? (
              <Badge variant={preview.locked ? "secondary" : "outline"}>
                {preview.locked
                  ? t("payroll.monthLocked")
                  : preview.source === "live"
                    ? t("payroll.monthLive")
                    : t("payroll.monthStored")}
              </Badge>
            ) : null}
            <Badge variant="outline">
              {t(`payroll.status.${preview?.runStatus ?? "draft"}`)}
            </Badge>
            {canCalculate ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={busy || loading || preview?.locked}
                onClick={() => void recalc()}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
                {t("payroll.recalculateMonth")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          {(
            [
              {
                key: "net",
                label: t("payroll.netPayroll"),
                value: totals ? formatEgp(totals.netPayroll, loc) : "—",
              },
              {
                key: "gross",
                label: t("payroll.grossTotal"),
                value: totals ? formatEgp(totals.grossTotal, loc) : "—",
              },
              {
                key: "ded",
                label: t("payroll.totalDeductions"),
                value: totals ? formatEgp(totals.totalDeductions, loc) : "—",
              },
              {
                key: "count",
                label: t("payroll.employeesIncluded"),
                value: totals ? String(totals.employeeCount) : "—",
              },
            ] as const
          ).map((card) => (
            <div
              key={card.key}
              className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"
            >
              <p className="text-[11px] text-muted-foreground">{card.label}</p>
              <p
                className={cn(
                  "mt-0.5 text-[15px] font-semibold tabular-nums",
                  card.key === "ded" && "text-rose-700 dark:text-rose-300"
                )}
              >
                {loading ? "…" : card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("payroll.searchEmployees")}
          className="h-10 sm:max-w-sm"
        />
        <p className="text-[12px] text-muted-foreground">
          {t("payroll.monthBoardHint")}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
          {t("payroll.ledgerEmpty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((slip) => {
            const emp = employees.find((e) => e.id === slip.employeeId);
            const name = emp?.name ?? slip.employeeName ?? slip.employeeId;
            const dept = emp?.department ?? slip.department ?? "—";
            const code = emp?.employeeId ?? slip.employeeCode ?? "";
            const open =
              expandedId === slip.employeeId ||
              selectedEmployeeId === slip.employeeId;
            const hitCount =
              (slip.attendanceImpacts?.length ?? 0) +
              (slip.leaveImpacts?.length ?? 0);

            return (
              <li
                key={slip.id}
                className={cn(
                  "rounded-xl border border-border/70 bg-card transition-colors",
                  open && "border-primary/35 shadow-[var(--shadow-card)]"
                )}
              >
                <button
                  type="button"
                  className="flex w-full flex-col gap-2 px-3 py-3 text-start sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => {
                    const next = open ? "" : slip.employeeId;
                    setExpandedId(next);
                    onSelectedEmployeeIdChange(slip.employeeId);
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[code, dept].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="rounded-lg bg-muted/60 px-2 py-1 text-[12px] tabular-nums">
                      {t("payroll.netSalary")}:{" "}
                      <strong>{formatEgp(slip.net, loc)}</strong>
                    </span>
                    <span className="rounded-lg bg-rose-500/10 px-2 py-1 text-[12px] tabular-nums text-rose-800 dark:text-rose-200">
                      {t("payroll.deductions")}:{" "}
                      <strong>{formatEgp(slip.deductionsTotal, loc)}</strong>
                      {hitCount > 0 ? ` · ${hitCount}` : ""}
                    </span>
                  </div>
                </button>

                {open ? (
                  <div className="space-y-3 border-t border-border/60 px-3 py-3">
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                        <dt className="text-[10px] text-muted-foreground">
                          {t("payroll.gross")}
                        </dt>
                        <dd className="text-[13px] font-semibold tabular-nums">
                          {formatEgp(slip.gross, loc)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                        <dt className="text-[10px] text-muted-foreground">
                          {t("payroll.allowances")}
                        </dt>
                        <dd className="text-[13px] font-semibold tabular-nums">
                          {formatEgp(slip.allowancesTotal, loc)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                        <dt className="text-[10px] text-muted-foreground">
                          {t("payroll.overtime")}
                        </dt>
                        <dd className="text-[13px] font-semibold tabular-nums">
                          {formatEgp(slip.overtimePay, loc)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                        <dt className="text-[10px] text-muted-foreground">
                          {t("payroll.netSalary")}
                        </dt>
                        <dd className="text-[13px] font-semibold tabular-nums">
                          {formatEgp(slip.net, loc)}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <p className="mb-1.5 text-[12px] font-semibold text-foreground">
                        {t("payroll.deductionWhyTitle")}
                      </p>
                      <PayrollDeductionWhy payslip={slip} compact />
                    </div>

                    {canEditSalary ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectedEmployeeIdChange(slip.employeeId);
                            onEditSalary(slip.employeeId);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("payroll.editSalaryProfile")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
