"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { SectionPanel } from "@/components/shared/section-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { LateDurationBadge } from "@/components/shared/late-duration-badge";
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
import { departmentLabel } from "@/lib/department-label";
import { downloadCsv, formatHours } from "@/lib/utils";
import { formatHmDuration } from "@/lib/duration-format";
import type { AttendanceRecord, Employee } from "@/types";
import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function AttendanceTable({
  records,
  employees,
  showHours = false,
  emptyTitle,
  emptyDescription,
}: {
  records: AttendanceRecord[];
  employees: Map<string, Employee>;
  showHours?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const title = emptyTitle ?? t("reports.emptyTitle");
  const description = emptyDescription ?? t("reports.emptyDesc");

  function handleExport() {
    const header = [
      t("common.name"),
      t("common.department"),
      t("common.date"),
      t("common.status"),
      t("attendance.checkIn"),
      showHours ? t("common.hours") : t("status.late"),
    ];
    const rows = records.map((record) => {
      const employee = employees.get(record.employeeId);
      return [
        employee?.name ?? record.employeeId,
        employee?.department
          ? departmentLabel(employee.department, t)
          : "",
        record.date,
        t(`status.${record.status}`),
        record.checkIn
          ? format(new Date(record.checkIn), "h:mm a", { locale: dateLocale })
          : "",
        showHours
          ? formatHours(record.workingMinutes)
          : record.lateMinutes > 0
            ? formatHmDuration(record.lateMinutes, t)
            : "",
      ];
    });
    downloadCsv(`rootk-attendance-${format(new Date(), "yyyy-MM-dd")}.csv`, [
      header,
      ...rows,
    ]);
    toast.success(t("reports.exported"));
  }

  if (records.length === 0) {
    return (
      <SectionPanel interactive={false} bare>
        <EmptyState compact title={title} description={description} />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel
      interactive={false}
      title={t("reports.detailTitle")}
      description={`${records.length} · ${t("reports.detailDesc")}`}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleExport}
        >
          <Download />
          {t("common.exportCsv")}
        </Button>
      }
    >
      <ul className="grid gap-2 md:hidden">
        {records.slice(0, 40).map((record) => {
          const employee = employees.get(record.employeeId);
          return (
            <li key={record.id} className="list-row px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {employee?.name ?? record.employeeId}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {employee?.department
                      ? departmentLabel(employee.department, t)
                      : "—"}{" "}
                    · {record.date}
                  </p>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {record.checkIn
                  ? format(new Date(record.checkIn), "h:mm a", {
                      locale: dateLocale,
                    })
                  : "—"}
                {" · "}
                {showHours
                  ? formatHours(record.workingMinutes)
                  : record.lateMinutes > 0
                    ? formatHmDuration(record.lateMinutes, t)
                    : "—"}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="hidden md:block">
        <DataTable embedded className="min-w-[36rem] sm:min-w-[640px]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>{t("common.name")}</DataTableHead>
              <DataTableHead>{t("common.department")}</DataTableHead>
              <DataTableHead>{t("common.date")}</DataTableHead>
              <DataTableHead>{t("common.status")}</DataTableHead>
              <DataTableHead>{t("attendance.checkIn")}</DataTableHead>
              <DataTableHead>
                {showHours ? t("common.hours") : t("status.late")}
              </DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {records.slice(0, 40).map((record) => {
              const employee = employees.get(record.employeeId);
              return (
                <DataTableRow key={record.id}>
                  <DataTableCell className="font-medium">
                    {employee?.name ?? record.employeeId}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {employee?.department
                      ? departmentLabel(employee.department, t)
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>{record.date}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={record.status} />
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {record.checkIn
                      ? format(new Date(record.checkIn), "h:mm a", {
                          locale: dateLocale,
                        })
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {showHours
                      ? formatHours(record.workingMinutes)
                      : record.lateMinutes > 0 ? (
                          <LateDurationBadge
                            minutes={record.lateMinutes}
                            size="sm"
                            durationOnly
                          />
                        ) : (
                          "—"
                        )}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </div>
    </SectionPanel>
  );
}
