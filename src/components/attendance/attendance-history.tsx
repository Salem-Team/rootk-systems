"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarDays, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SoftListRow } from "@/components/shared/meta-chip";
import { AttendanceDurationBadge } from "@/components/shared/late-duration-badge";
import { SectionPanel } from "@/components/shared/section-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
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
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { formatHours } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/types";

interface AttendanceHistoryProps {
  records: AttendanceRecord[];
  loading?: boolean;
}

type StatusFilter = AttendanceStatus | "all";

function formatTime(iso: string | undefined, dateLocale: typeof enUS): string {
  if (!iso) return "—";
  return format(parseISO(iso), "h:mm a", { locale: dateLocale });
}

export function AttendanceHistory({
  records,
  loading = false,
}: AttendanceHistoryProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return records;
    return records.filter((r) => r.status === statusFilter);
  }, [records, statusFilter]);

  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <SectionPanel
        title={t("attendance.history")}
        description={t("attendance.historyDesc")}
        icon={<CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />}
        actions={
          <div className="w-full space-y-2 sm:max-w-[200px]">
            <Label htmlFor="history-status-filter">{t("common.status")}</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger
                id="history-status-filter"
                aria-label={t("common.status")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="present">{t("status.present")}</SelectItem>
                <SelectItem value="late">{t("status.late")}</SelectItem>
                <SelectItem value="absent">{t("status.absent")}</SelectItem>
                <SelectItem value="wfh">{t("status.wfh")}</SelectItem>
                <SelectItem value="on_leave">{t("status.on_leave")}</SelectItem>
                <SelectItem value="early_leave">
                  {t("status.early_leave")}
                </SelectItem>
                <SelectItem value="half_day">{t("status.half_day")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        bodyClassName="!p-0"
      >
        {filtered.length === 0 ? (
          <EmptyState
            compact
            icon={Clock}
            title={t("attendance.emptyHistory")}
            description={t("attendance.emptyHistoryDesc")}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable>
                <DataTableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead>{t("common.date")}</DataTableHead>
                    <DataTableHead>{t("attendance.checkIn")}</DataTableHead>
                    <DataTableHead>{t("attendance.checkOut")}</DataTableHead>
                    <DataTableHead>{t("common.hours")}</DataTableHead>
                    <DataTableHead>{t("common.status")}</DataTableHead>
                    <DataTableHead>{t("common.actions")}</DataTableHead>
                  </DataTableHeaderRow>
                </DataTableHeader>
                <DataTableBody>
                  {filtered.map((record) => (
                    <DataTableRow key={record.id}>
                      <DataTableCell className="font-medium">
                        {format(parseISO(record.date), "EEE, MMM d", {
                          locale: dateLocale,
                        })}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-muted-foreground tabular-nums">
                        {formatTime(record.checkIn, dateLocale)}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-muted-foreground tabular-nums">
                        {formatTime(record.checkOut, dateLocale)}
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">
                        {record.workingMinutes > 0
                          ? formatHours(record.workingMinutes)
                          : "—"}
                      </DataTableCell>
                      <DataTableCell>
                        <StatusBadge status={record.status} />
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {record.isLate ? (
                            <AttendanceDurationBadge
                              minutes={record.lateMinutes}
                              size="sm"
                            />
                          ) : null}
                          {record.isEarlyLeave ? (
                            <AttendanceDurationBadge
                              kind="early"
                              minutes={Math.max(record.earlyLeaveMinutes ?? 0, 1)}
                              size="sm"
                            />
                          ) : null}
                          {(record.overtimeMinutes ?? 0) > 0 ? (
                            <AttendanceDurationBadge
                              kind="overtime"
                              minutes={record.overtimeMinutes ?? 0}
                              size="sm"
                            />
                          ) : null}
                          {!record.isLate &&
                          !record.isEarlyLeave &&
                          !(record.overtimeMinutes ?? 0) ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : null}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>

            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-2.5 p-3 md:hidden"
              aria-label={t("attendance.history")}
            >
              {filtered.map((record) => (
                <motion.li key={record.id} variants={fadeInUp}>
                  <SoftListRow>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {format(parseISO(record.date), "EEE, MMM d", {
                            locale: dateLocale,
                          })}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
                          {formatTime(record.checkIn, dateLocale)} →{" "}
                          {formatTime(record.checkOut, dateLocale)}
                        </p>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg bg-card px-2 py-1 font-medium tabular-nums">
                        {record.workingMinutes > 0
                          ? formatHours(record.workingMinutes)
                          : "—"}
                      </span>
                      {record.isLate ? (
                        <AttendanceDurationBadge
                          minutes={record.lateMinutes}
                          size="sm"
                        />
                      ) : null}
                      {record.isEarlyLeave ? (
                        <AttendanceDurationBadge
                          kind="early"
                          minutes={Math.max(record.earlyLeaveMinutes ?? 0, 1)}
                          size="sm"
                        />
                      ) : null}
                      {(record.overtimeMinutes ?? 0) > 0 ? (
                        <AttendanceDurationBadge
                          kind="overtime"
                          minutes={record.overtimeMinutes ?? 0}
                          size="sm"
                        />
                      ) : null}
                    </div>
                  </SoftListRow>
                </motion.li>
              ))}
            </motion.ul>
          </>
        )}
      </SectionPanel>
    </motion.div>
  );
}
