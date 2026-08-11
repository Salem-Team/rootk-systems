"use client";

import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
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
import type { DailyReportFact, DailyReportRow } from "@/types";

export function formatReportClock(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function attendanceBadgeVariant(status: string | null) {
  if (status === "present") return "success" as const;
  if (status === "late" || status === "early_leave") return "warning" as const;
  if (status === "absent") return "danger" as const;
  if (status === "wfh" || status === "half_day") return "info" as const;
  if (status === "on_leave") return "secondary" as const;
  return "outline" as const;
}

export function attendanceLabel(
  status: string | null,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  if (status === "present") return t("status.present");
  if (status === "absent") return t("status.absent");
  if (status === "late") return t("status.late");
  if (status === "wfh") return t("status.wfh");
  if (status === "early_leave") return t("status.early_leave");
  if (status === "half_day") return t("status.half_day");
  if (status === "on_leave") return t("status.on_leave");
  return "—";
}

export function factLabel(
  fact: DailyReportFact,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  if (fact.kind === "leave") return t("dailyPlan.factLeave");
  if (fact.kind === "absent") return t("dailyPlan.factAbsent");
  if (fact.kind === "present") return t("dailyPlan.factPresent");
  if (fact.kind === "none") return t("dailyPlan.factNone");
  if (fact.kind === "tasks") {
    return t("dailyPlan.factTasks", {
      count: fact.count ?? 0,
      sample: fact.sample ?? "",
    });
  }
  if (fact.kind === "ads") return t("dailyPlan.factAds", { count: fact.count ?? 0 });
  if (fact.kind === "crm") return t("dailyPlan.factCrm", { count: fact.count ?? 0 });
  return t("dailyPlan.factMeetings", { count: fact.count ?? 0 });
}

function factsText(
  row: DailyReportRow,
  t: ReturnType<typeof useTranslation>["t"]
) {
  return row.facts.map((fact) => factLabel(fact, t)).join(" · ");
}

export function DailyReportResults({
  loading,
  error,
  rows,
}: {
  loading: boolean;
  error: string | null;
  rows: DailyReportRow[];
}) {
  const { t, locale } = useTranslation();

  if (loading) return <TableSkeleton rows={6} />;
  if (error) {
    return (
      <EmptyState
        compact
        icon={ClipboardList}
        title={t("dailyPlan.reportError")}
        description={error}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={ClipboardList}
        title={t("dailyPlan.reportEmpty")}
        description={t("dailyPlan.reportEmptyDesc")}
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
                <p className="truncate text-[15px] font-semibold tracking-tight">
                  {row.name}
                </p>
                <div className="mt-1">
                  <DepartmentBadge
                    department={row.department}
                    className="max-w-full truncate"
                  />
                </div>
              </div>
              <Badge
                variant={attendanceBadgeVariant(row.attendanceStatus)}
                className="shrink-0"
              >
                {attendanceLabel(row.attendanceStatus, t)}
              </Badge>
            </div>

            <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatReportClock(row.checkIn, locale)} –{" "}
              {formatReportClock(row.checkOut, locale)}
            </p>

            <dl className="mt-3 grid grid-cols-3 gap-1.5">
              <div className="rounded-xl bg-muted/50 px-2 py-2 text-center">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("dailyPlan.colTasks")}
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                  {row.tasksCompleted}
                  <span className="ms-0.5 text-[11px] font-normal text-muted-foreground">
                    /{row.tasksOpen}
                  </span>
                </dd>
              </div>
              <div className="rounded-xl bg-muted/50 px-2 py-2 text-center">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("dailyPlan.colAds")}
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                  {row.adsCount}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/50 px-2 py-2 text-center">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("dailyPlan.colHours")}
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                  {formatWorkedHours(row.workingMinutes)}
                </dd>
              </div>
            </dl>

            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
              {factsText(row, t)}
            </p>
          </article>
        ))}
      </div>

      <div className="hidden lg:block">
        <DataTable className="min-w-[40rem]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("dailyPlan.colEmployee")}</DataTableHead>
              <DataTableHead>{t("dailyPlan.colAttendance")}</DataTableHead>
              <DataTableHead>{t("dailyPlan.colHours")}</DataTableHead>
              <DataTableHead>{t("dailyPlan.colTasks")}</DataTableHead>
              <DataTableHead>{t("dailyPlan.colAds")}</DataTableHead>
              <DataTableHead>{t("dailyPlan.colSummary")}</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {rows.map((row) => (
              <DataTableRow key={row.employeeId}>
                <DataTableCell className="py-3.5">
                  <div className="font-medium">{row.name}</div>
                  <div className="mt-1">
                    <DepartmentBadge department={row.department} />
                  </div>
                </DataTableCell>
                <DataTableCell className="py-3.5">
                  <Badge variant={attendanceBadgeVariant(row.attendanceStatus)}>
                    {attendanceLabel(row.attendanceStatus, t)}
                  </Badge>
                  <div className="mt-1 font-mono text-[12px] tabular-nums text-muted-foreground">
                    {formatReportClock(row.checkIn, locale)} –{" "}
                    {formatReportClock(row.checkOut, locale)}
                  </div>
                </DataTableCell>
                <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                  {formatWorkedHours(row.workingMinutes)}
                </DataTableCell>
                <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                  {row.tasksCompleted}
                  <span className="ms-1 text-muted-foreground">
                    / {row.tasksOpen} {t("dailyPlan.openShort")}
                  </span>
                </DataTableCell>
                <DataTableCell className="py-3.5 font-mono text-[13px] tabular-nums">
                  {row.adsCount}
                </DataTableCell>
                <DataTableCell className="max-w-[18rem] py-3.5 text-[13px] leading-relaxed text-muted-foreground">
                  {factsText(row, t)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </>
  );
}
