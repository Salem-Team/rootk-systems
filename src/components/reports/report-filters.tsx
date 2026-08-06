"use client";

import { format } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  Bookmark,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterShell } from "@/components/shared/filter-shell";
import { departmentLabel } from "@/lib/department-label";
import { useDepartments } from "@/hooks/use-departments";
import { useTranslation } from "@/hooks/use-translation";
import { demoNow } from "@/lib/mock-date";
import { cn } from "@/lib/utils";
import type { AttendanceStatus, Department } from "@/types";

export interface ReportFilterValues {
  department: Department | "all";
  status: AttendanceStatus | "all";
  employee: string | "all";
  location: string | "all";
  shift: string | "all";
  workMode: string | "all";
  leaveType: string | "all";
  range?: DateRange;
}

interface ReportFiltersProps {
  value: ReportFilterValues;
  onChange: (value: ReportFilterValues) => void;
  employees?: { id: string; name: string }[];
}

const DEFAULT_FILTERS: ReportFilterValues = {
  department: "all",
  status: "all",
  employee: "all",
  location: "all",
  shift: "all",
  workMode: "all",
  leaveType: "all",
};

export function ReportFilters({
  value,
  onChange,
  employees = [],
}: ReportFiltersProps) {
  const { t, locale } = useTranslation();
  const { activeNames } = useDepartments();
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const statusOptions: { value: AttendanceStatus | "all"; label: string }[] = [
    { value: "all", label: t("employees.allStatuses") },
    { value: "present", label: t("status.present") },
    { value: "late", label: t("status.late") },
    { value: "absent", label: t("status.absent") },
    { value: "wfh", label: t("status.wfh") },
    { value: "on_leave", label: t("status.on_leave") },
    { value: "early_leave", label: t("status.early_leave") },
    { value: "half_day", label: t("status.half_day") },
  ];

  function uiExport(kind: string) {
    toast.success(t("analytics.exportQueued", { kind }));
  }

  return (
    <FilterShell>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>{t("reports.dateRange")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 w-full justify-start font-normal",
                    !value.range?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarDays />
                  {value.range?.from ? (
                    value.range.to ? (
                      <>
                        {format(value.range.from, "LLL d", {
                          locale: dateLocale,
                        })}{" "}
                        –{" "}
                        {format(value.range.to, "LLL d, y", {
                          locale: dateLocale,
                        })}
                      </>
                    ) : (
                      format(value.range.from, "LLL d, y", {
                        locale: dateLocale,
                      })
                    )
                  ) : (
                    t("reports.pickDates")
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={value.range}
                  onSelect={(range) => onChange({ ...value, range })}
                  defaultMonth={value.range?.from ?? demoNow()}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t("common.department")}</Label>
            <Select
              value={value.department}
              onValueChange={(v) =>
                onChange({ ...value, department: v as Department | "all" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("employees.allDepartments")}</SelectItem>
                {activeNames.map((d) => (
                  <SelectItem key={d} value={d}>
                    {departmentLabel(d, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("analytics.filterEmployee")}</Label>
            <Select
              value={value.employee}
              onValueChange={(v) => onChange({ ...value, employee: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {employees.slice(0, 20).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("common.status")}</Label>
            <Select
              value={value.status}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  status: v as AttendanceStatus | "all",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("analytics.filterLocation")}</Label>
            <Select
              value={value.location}
              onValueChange={(v) => onChange({ ...value, location: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="Cairo">{t("locations.cairo")}</SelectItem>
                <SelectItem value="Alexandria">
                  {t("locations.alexandria")}
                </SelectItem>
                <SelectItem value="Giza">{t("locations.giza")}</SelectItem>
                <SelectItem value="Remote">{t("locations.remote")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("analytics.filterShift")}</Label>
            <Select
              value={value.shift}
              onValueChange={(v) => onChange({ ...value, shift: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="morning">{t("admin.shiftMorning")}</SelectItem>
                <SelectItem value="evening">{t("admin.shiftEvening")}</SelectItem>
                <SelectItem value="flexible">
                  {t("admin.shiftFlexible")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("analytics.filterWorkMode")}</Label>
            <Select
              value={value.workMode}
              onValueChange={(v) => onChange({ ...value, workMode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="office">{t("analytics.modeOffice")}</SelectItem>
                <SelectItem value="hybrid">{t("analytics.modeHybrid")}</SelectItem>
                <SelectItem value="remote">{t("analytics.modeRemote")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("analytics.filterLeaveType")}</Label>
            <Select
              value={value.leaveType}
              onValueChange={(v) => onChange({ ...value, leaveType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="annual">{t("leaveTypes.annual")}</SelectItem>
                <SelectItem value="sick">{t("leaveTypes.sick")}</SelectItem>
                <SelectItem value="personal">
                  {t("leaveTypes.personal")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...DEFAULT_FILTERS, range: undefined })}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("analytics.resetFilters")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast.success(t("analytics.viewSaved"))}
            >
              <Bookmark className="h-3.5 w-3.5" />
              {t("analytics.savedViews")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => uiExport("CSV")}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => uiExport("Excel")}
            >
              <FileText className="h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => uiExport("PDF")}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => uiExport("Print")}
            >
              <Printer className="h-3.5 w-3.5" />
              {t("analytics.print")}
            </Button>
          </div>
        </div>
      </div>
    </FilterShell>
  );
}

export { DEFAULT_FILTERS };
