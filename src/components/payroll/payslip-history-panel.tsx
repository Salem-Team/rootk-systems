"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronsUpDown,
  Minus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { PayslipHistoryItem } from "@/types/payroll";

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
  calculated: "info",
};

function normalizePeriodKey(periodId: string) {
  const match = periodId.match(/(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : periodId;
}

function formatPeriodLabel(periodId: string, fallback: string, locale: string) {
  const key = normalizePeriodKey(periodId);
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return fallback || periodId;
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, 1)));
  } catch {
    return fallback || periodId;
  }
}

function deltaPercent(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

type HistoryRow = PayslipHistoryItem & {
  prevNet: number | null;
  netDelta: number | null;
  netDeltaPct: number | null;
  grossDelta: number | null;
};

function DeltaPill({
  amount,
  pct,
  loc,
  unchangedLabel,
  noCompareLabel,
}: {
  amount: number | null;
  pct: number | null;
  loc: "en" | "ar";
  unchangedLabel: string;
  noCompareLabel: string;
}) {
  if (amount == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden />
        {noCompareLabel}
      </span>
    );
  }

  if (amount === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden />
        {unchangedLabel}
      </span>
    );
  }

  const up = amount > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums",
        up
          ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200"
          : "bg-rose-500/12 text-rose-800 dark:text-rose-200"
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
      )}
      {up ? "+" : "−"}
      {formatEgp(Math.abs(amount), loc)}
      {pct != null ? (
        <span className="opacity-80">
          ({up ? "+" : "−"}
          {Math.abs(pct).toFixed(1)}%)
        </span>
      ) : null}
    </span>
  );
}

export function PayslipHistoryPanel({
  items,
  title,
}: {
  items: PayslipHistoryItem[];
  title?: string;
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo<HistoryRow[]>(() => {
    const chronological = [...items].sort((a, b) =>
      normalizePeriodKey(a.periodId).localeCompare(
        normalizePeriodKey(b.periodId)
      )
    );

    const enriched = chronological.map((item, index) => {
      const prev = index > 0 ? chronological[index - 1] : null;
      const netDelta = prev ? item.net - prev.net : null;
      const grossDelta = prev ? item.gross - prev.gross : null;
      return {
        ...item,
        prevNet: prev?.net ?? null,
        netDelta,
        netDeltaPct: prev ? deltaPercent(item.net, prev.net) : null,
        grossDelta,
      };
    });

    return enriched.reverse();
  }, [items]);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const newest = rows[0];
    const oldest = rows[rows.length - 1];
    const avgNet =
      rows.reduce((sum, row) => sum + row.net, 0) / Math.max(rows.length, 1);
    const spanDelta = newest.net - oldest.net;
    const spanPct = deltaPercent(newest.net, oldest.net);
    return { newest, avgNet, spanDelta, spanPct, count: rows.length };
  }, [rows]);

  if (items.length === 0) {
    return (
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold tracking-tight">
            {title ?? t("payroll.salaryMonthHistory")}
          </h3>
        </div>
        <div className="p-4">
          <EmptyState title={t("payroll.historyEmpty")} />
        </div>
      </section>
    );
  }

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[0.95rem] font-semibold tracking-tight">
          {title ?? t("payroll.salaryMonthHistory")}
        </h3>
        <Badge variant="outline" className="tabular-nums">
          {t("payroll.historyMonthsCount", { count: rows.length })}
        </Badge>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-2 border-b border-border/60 p-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              {t("payroll.historyLatestNet")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold tabular-nums">
              <Wallet className="h-3.5 w-3.5 text-primary" aria-hidden />
              {formatEgp(summary.newest.net, loc)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              {t("payroll.historyAvgNet")}
            </p>
            <p className="mt-1 text-[15px] font-semibold tabular-nums">
              {formatEgp(summary.avgNet, loc)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              {t("payroll.historyVsPrevMonth")}
            </p>
            <div className="mt-1">
              <DeltaPill
                amount={summary.newest.netDelta}
                pct={summary.newest.netDeltaPct}
                loc={loc}
                unchangedLabel={t("payroll.historyUnchanged")}
                noCompareLabel={t("payroll.historyNoCompare")}
              />
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              {t("payroll.historySpanChange")}
            </p>
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-[15px] font-semibold tabular-nums",
                summary.spanDelta > 0 &&
                  "text-emerald-700 dark:text-emerald-300",
                summary.spanDelta < 0 && "text-rose-700 dark:text-rose-300"
              )}
            >
              {summary.spanDelta > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              ) : summary.spanDelta < 0 ? (
                <TrendingDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Minus className="h-3.5 w-3.5" aria-hidden />
              )}
              {summary.spanDelta === 0
                ? formatEgp(0, loc)
                : `${summary.spanDelta > 0 ? "+" : "−"}${formatEgp(
                    Math.abs(summary.spanDelta),
                    loc
                  )}`}
            </p>
          </div>
        </div>
      ) : null}

      <ul className="divide-y divide-border/60">
        {rows.map((row) => {
          const open = expandedId === row.id;
          const label = formatPeriodLabel(
            row.periodId,
            row.periodLabel,
            locale
          );

          return (
            <li key={row.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col gap-2 px-3 py-3 text-start transition-colors sm:flex-row sm:items-center sm:justify-between",
                  open ? "bg-primary/[0.04]" : "hover:bg-muted/30"
                )}
                onClick={() => setExpandedId(open ? null : row.id)}
                aria-expanded={open}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold tracking-tight">
                      {label}
                    </p>
                    <Badge variant={STATUS_VARIANT[row.status] ?? "info"}>
                      {t(`payroll.status.${row.status}`)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t("payroll.payDate")}: {row.payDate}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground">
                      {t("payroll.netSalary")}
                    </p>
                    <p className="text-[14px] font-semibold tabular-nums">
                      {formatEgp(row.net, loc)}
                    </p>
                  </div>
                  <DeltaPill
                    amount={row.netDelta}
                    pct={row.netDeltaPct}
                    loc={loc}
                    unchangedLabel={t("payroll.historyUnchanged")}
                    noCompareLabel={t("payroll.historyNoCompare")}
                  />
                  <ChevronsUpDown
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              </button>

              {open ? (
                <div className="space-y-3 border-t border-border/50 bg-muted/15 px-3 py-3">
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {(
                      [
                        {
                          key: "gross",
                          label: t("payroll.gross"),
                          value: row.gross,
                        },
                        {
                          key: "allowances",
                          label: t("payroll.allowances"),
                          value: row.allowancesTotal ?? 0,
                        },
                        {
                          key: "ot",
                          label: t("payroll.overtime"),
                          value: row.overtimePay ?? 0,
                        },
                        {
                          key: "bonuses",
                          label: t("payroll.bonuses"),
                          value: row.bonusesTotal ?? 0,
                        },
                        {
                          key: "deductions",
                          label: t("payroll.totalDeductions"),
                          value: row.deductionsTotal ?? 0,
                          danger: true,
                        },
                        {
                          key: "net",
                          label: t("payroll.netSalary"),
                          value: row.net,
                          emphasis: true,
                        },
                      ] as const
                    ).map((cell) => (
                      <div
                        key={cell.key}
                        className="rounded-xl border border-border/60 bg-card px-2.5 py-2"
                      >
                        <dt className="text-[10px] text-muted-foreground">
                          {cell.label}
                        </dt>
                        <dd
                          className={cn(
                            "mt-0.5 text-[13px] font-semibold tabular-nums",
                            "danger" in cell &&
                              cell.danger &&
                              "text-rose-700 dark:text-rose-300",
                            "emphasis" in cell &&
                              cell.emphasis &&
                              "text-primary"
                          )}
                        >
                          {"danger" in cell && cell.danger ? "−" : ""}
                          {formatEgp(cell.value, loc)}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    {row.prevNet != null ? (
                      <span className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-muted-foreground">
                        {t("payroll.historyPreviousNet")}:{" "}
                        <strong className="tabular-nums text-foreground">
                          {formatEgp(row.prevNet, loc)}
                        </strong>
                      </span>
                    ) : null}
                    {row.grossDelta != null ? (
                      <span className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-muted-foreground">
                        {t("payroll.historyGrossDelta")}:{" "}
                        <strong
                          className={cn(
                            "tabular-nums",
                            row.grossDelta > 0 &&
                              "text-emerald-700 dark:text-emerald-300",
                            row.grossDelta < 0 &&
                              "text-rose-700 dark:text-rose-300",
                            row.grossDelta === 0 && "text-foreground"
                          )}
                        >
                          {row.grossDelta === 0
                            ? formatEgp(0, loc)
                            : `${row.grossDelta > 0 ? "+" : "−"}${formatEgp(
                                Math.abs(row.grossDelta),
                                loc
                              )}`}
                        </strong>
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
