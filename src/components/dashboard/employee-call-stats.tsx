"use client";

import { PhoneCall } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
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

  return (
    <section className="surface-panel overflow-hidden">
      <div className="border-b border-border/70 px-4 py-3.5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {t("dashboard.callStatsTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("dashboard.callStatsDesc")}
            </p>
          </div>
          <PhoneCall className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <CallKpi label={t("reports.colCalls")} value={totals.active + totals.inactive} />
          <CallKpi label={t("reports.colActiveCalls")} value={totals.active} tone="ok" />
          <CallKpi
            label={t("reports.colInactiveCalls")}
            value={totals.inactive}
            tone="warn"
          />
        </dl>
      </div>

      {ranked.length === 0 ? (
        <EmptyState
          compact
          icon={PhoneCall}
          title={t("reports.emptyTitle")}
          description={t("dashboard.callStatsEmpty")}
        />
      ) : (
        <>
        <ul className="grid max-h-[22rem] gap-2 overflow-auto p-3 md:hidden">
          {ranked.map((row) => {
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
                    <dt className="text-[10px] text-muted-foreground">
                      {t("reports.colCalls")}
                    </dt>
                    <dd className="font-mono text-[13px] font-semibold tabular-nums">
                      {total}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-1.5 py-1.5">
                    <dt className="text-[10px] text-muted-foreground">
                      {t("reports.colActiveCalls")}
                    </dt>
                    <dd className="font-mono text-[13px] tabular-nums text-emerald-700 dark:text-emerald-300">
                      {row.crmActiveCalls ?? 0}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-1.5 py-1.5">
                    <dt className="text-[10px] text-muted-foreground">
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
        <div className="hidden max-h-[22rem] overflow-auto md:block">
          <DataTable embedded className="min-w-[28rem]">
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead>{t("dailyPlan.colEmployee")}</DataTableHead>
                <DataTableHead>{t("reports.colCalls")}</DataTableHead>
                <DataTableHead>{t("reports.colActiveCalls")}</DataTableHead>
                <DataTableHead>{t("reports.colInactiveCalls")}</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {ranked.map((row) => {
                const total =
                  (row.crmActiveCalls ?? 0) + (row.crmInactiveCalls ?? 0);
                return (
                  <DataTableRow key={row.employeeId}>
                    <DataTableCell className="py-2.5">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.department}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="py-2.5 font-mono text-[13px] font-semibold tabular-nums">
                      {total}
                    </DataTableCell>
                    <DataTableCell className="py-2.5 font-mono text-[13px] tabular-nums text-emerald-700 dark:text-emerald-300">
                      {row.crmActiveCalls ?? 0}
                    </DataTableCell>
                    <DataTableCell className="py-2.5 font-mono text-[13px] tabular-nums text-rose-700 dark:text-rose-300">
                      {row.crmInactiveCalls ?? 0}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </div>
        </>
      )}
    </section>
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
    <div className="rounded-xl bg-muted/45 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          tone === "ok"
            ? "mt-0.5 font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300"
            : tone === "warn"
              ? "mt-0.5 font-mono text-lg font-semibold tabular-nums text-rose-700 dark:text-rose-300"
              : "mt-0.5 font-mono text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
