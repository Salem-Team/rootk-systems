"use client";

import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { useTranslation } from "@/hooks/use-translation";
import { formatWorkedHours } from "@/lib/daily-report";
import type { DailyReportRow } from "@/types";

export function EmployeeActivityTable({
  rows,
  compact = false,
}: {
  rows: DailyReportRow[];
  compact?: boolean;
}) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={Users}
        title={t("reports.emptyTitle")}
        description={t("reports.emptyDesc")}
      />
    );
  }

  return (
    <>
      <div className="space-y-2.5 lg:hidden">
        {rows.map((row) => (
          <article
            key={row.employeeId}
            className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{row.name}</p>
                <div className="mt-1">
                  <DepartmentBadge department={row.department} />
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono">
                {(row.crmActiveCalls ?? 0) + (row.crmInactiveCalls ?? 0)}{" "}
                {t("reports.colCalls")}
              </Badge>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-1.5">
              <Stat label={t("reports.colActiveCalls")} value={row.crmActiveCalls ?? 0} />
              <Stat
                label={t("reports.colInactiveCalls")}
                value={row.crmInactiveCalls ?? 0}
              />
              <Stat label={t("dailyPlan.colTasks")} value={row.tasksCompleted} />
              <Stat label={t("dailyPlan.colAds")} value={row.adsCount} />
              <Stat
                label={t("dailyPlan.colHours")}
                value={formatWorkedHours(row.workingMinutes)}
              />
              <Stat label={t("reports.colMeetings")} value={row.meetingsCount} />
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden lg:block">
        <DataTable className="min-w-[52rem]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("dailyPlan.colEmployee")}</DataTableHead>
              <DataTableHead>{t("reports.statsPresent")}</DataTableHead>
              <DataTableHead>{t("reports.statsLate")}</DataTableHead>
              <DataTableHead>{t("reports.statsAbsent")}</DataTableHead>
              <DataTableHead>{t("dailyPlan.colHours")}</DataTableHead>
              <DataTableHead>{t("dailyPlan.colTasks")}</DataTableHead>
              {!compact ? (
                <DataTableHead>{t("dailyPlan.colAds")}</DataTableHead>
              ) : null}
              <DataTableHead>{t("reports.colCalls")}</DataTableHead>
              <DataTableHead>{t("reports.colActiveCalls")}</DataTableHead>
              <DataTableHead>{t("reports.colInactiveCalls")}</DataTableHead>
              {!compact ? (
                <DataTableHead>{t("reports.colMeetings")}</DataTableHead>
              ) : null}
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {rows.map((row) => {
              const calls =
                (row.crmActiveCalls ?? 0) + (row.crmInactiveCalls ?? 0);
              return (
                <DataTableRow key={row.employeeId}>
                  <DataTableCell className="py-3.5">
                    <div className="font-medium">{row.name}</div>
                    <div className="mt-1">
                      <DepartmentBadge department={row.department} />
                    </div>
                  </DataTableCell>
                  <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                    {row.presentDays ?? 0}
                  </DataTableCell>
                  <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                    {row.lateDays ?? 0}
                  </DataTableCell>
                  <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                    {row.absentDays ?? 0}
                  </DataTableCell>
                  <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                    {formatWorkedHours(row.workingMinutes)}
                  </DataTableCell>
                  <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                    {row.tasksCompleted}
                  </DataTableCell>
                  {!compact ? (
                    <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                      {row.adsCount}
                    </DataTableCell>
                  ) : null}
                  <DataTableCell className="py-3.5 font-mono text-[13px] font-semibold tabular-nums">
                    {calls}
                  </DataTableCell>
                  <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums text-emerald-700 dark:text-emerald-300">
                    {row.crmActiveCalls ?? 0}
                  </DataTableCell>
                  <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums text-rose-700 dark:text-rose-300">
                    {row.crmInactiveCalls ?? 0}
                  </DataTableCell>
                  {!compact ? (
                    <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                      {row.meetingsCount}
                    </DataTableCell>
                  ) : null}
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/50 px-2 py-2 text-center">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
