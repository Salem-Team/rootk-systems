"use client";

import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { DailyReportRow } from "@/types";

export function EmployeeCallStats({ rows }: { rows: DailyReportRow[] }) {
  const { t } = useTranslation();
  const ranked = [...rows].sort((a, b) => {
    const aCalls = (a.crmActiveCalls ?? 0) + (a.crmInactiveCalls ?? 0);
    const bCalls = (b.crmActiveCalls ?? 0) + (b.crmInactiveCalls ?? 0);
    return bCalls - aCalls || a.name.localeCompare(b.name);
  });
  const totals = ranked.reduce(
    (acc, row) => {
      acc.active += row.crmActiveCalls ?? 0;
      acc.inactive += row.crmInactiveCalls ?? 0;
      return acc;
    },
    { active: 0, inactive: 0 }
  );
  const totalCalls = totals.active + totals.inactive;
  const topRows = ranked.slice(0, 6);

  return (
    <section className="surface-panel flex h-full flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[0.95rem] font-semibold tracking-tight">
              {t("dashboard.callStatsTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("dashboard.callStatsDesc")}
            </p>
          </div>
          <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <CallRing active={totals.active} inactive={totals.inactive} total={totalCalls} />
          <dl className="grid flex-1 grid-cols-1 gap-2">
            <CallKpi label={t("reports.colCalls")} value={totalCalls} />
            <div className="grid grid-cols-2 gap-2">
              <CallKpi
                label={t("reports.colActiveCalls")}
                value={totals.active}
                tone="ok"
              />
              <CallKpi
                label={t("reports.colInactiveCalls")}
                value={totals.inactive}
                tone="warn"
              />
            </div>
          </dl>
        </div>
      </div>

      {topRows.length === 0 ? (
        <EmptyState
          compact
          icon={PhoneCall}
          title={t("reports.emptyTitle")}
          description={t("dashboard.callStatsEmpty")}
        />
      ) : (
        <>
          <ul className="grid max-h-[14rem] gap-2 overflow-auto p-3 md:hidden">
            {topRows.map((row) => {
              const total =
                (row.crmActiveCalls ?? 0) + (row.crmInactiveCalls ?? 0);
              return (
                <li
                  key={row.employeeId}
                  className="rounded-xl border border-border/70 bg-card px-3 py-2.5"
                >
                  <p className="truncate text-[13px] font-semibold">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.department}
                  </p>
                  <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                    <div className="rounded-lg bg-muted/50 px-1.5 py-1.5">
                      <dt className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                        {t("reports.colCalls")}
                      </dt>
                      <dd className="font-mono text-[13px] font-semibold tabular-nums">
                        {total}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-1.5 py-1.5">
                      <dt className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                        {t("reports.colActiveCalls")}
                      </dt>
                      <dd className="font-mono text-[13px] tabular-nums text-emerald-700 dark:text-emerald-300">
                        {row.crmActiveCalls ?? 0}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-1.5 py-1.5">
                      <dt className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                        {t("reports.colInactiveCalls")}
                      </dt>
                      <dd className="font-mono text-[13px] tabular-nums text-rose-700 dark:text-rose-300">
                        {row.crmInactiveCalls ?? 0}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>

          <div className="hidden flex-1 overflow-auto md:block">
            <DataTable embedded className="min-w-0">
              <DataTableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>{t("dailyPlan.colEmployee")}</DataTableHead>
                  <DataTableHead className="text-end">
                    {t("reports.colCalls")}
                  </DataTableHead>
                </DataTableHeaderRow>
              </DataTableHeader>
              <DataTableBody>
                {topRows.map((row) => {
                  const total =
                    (row.crmActiveCalls ?? 0) + (row.crmInactiveCalls ?? 0);
                  return (
                    <DataTableRow key={row.employeeId}>
                      <DataTableCell className="py-2.5">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {row.department}
                        </p>
                      </DataTableCell>
                      <DataTableCell className="py-2.5 text-end">
                        <span className="font-mono text-[13px] font-semibold tabular-nums">
                          {total}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {row.crmActiveCalls ?? 0} / {row.crmInactiveCalls ?? 0}
                        </span>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </div>

          <div className="border-t border-border/60 px-3 py-2.5 sm:px-4">
            <Button asChild variant="ghost" size="sm" className="w-full justify-center">
              <Link href="/reports">{t("dashboard.viewCallReports")}</Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function CallRing({
  active,
  inactive,
  total,
}: {
  active: number;
  inactive: number;
  total: number;
}) {
  const size = 72;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeLen = total > 0 ? (active / total) * circumference : 0;
  const inactiveLen = total > 0 ? (inactive / total) * circumference : 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/70"
        />
        {total > 0 ? (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeDasharray={`${activeLen} ${circumference - activeLen}`}
              strokeLinecap="round"
              className="text-emerald-600 dark:text-emerald-400"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeDasharray={`${inactiveLen} ${circumference - inactiveLen}`}
              strokeDashoffset={-activeLen}
              strokeLinecap="round"
              className="text-rose-500 dark:text-rose-400"
            />
          </>
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-sm font-semibold tabular-nums leading-none">
          {total}
        </span>
      </div>
    </div>
  );
}

function CallKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg bg-muted/45 px-2.5 py-1.5">
      <dt className="line-clamp-2 text-[10px] font-medium leading-tight text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 font-mono text-base font-semibold tabular-nums",
          tone === "ok" && "text-emerald-700 dark:text-emerald-300",
          tone === "warn" && "text-rose-700 dark:text-rose-300"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
