import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { departmentLabel } from "@/lib/department-label";
import { useDepartments } from "@/hooks/use-departments";
import { useTranslation } from "@/hooks/use-translation";
import type { AttendanceStatus, Department } from "@/types";
import type { ReportFilterValues } from "./report-filters-types";

export function ReportSelectFilters({
  value,
  onChange,
  employees = [],
}: {
  value: ReportFilterValues;
  onChange: (value: ReportFilterValues) => void;
  employees?: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const { activeNames } = useDepartments();

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

  return (
    <>
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
            onChange({ ...value, status: v as AttendanceStatus | "all" })
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
            <SelectItem value="Alexandria">{t("locations.alexandria")}</SelectItem>
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
            <SelectItem value="flexible">{t("admin.shiftFlexible")}</SelectItem>
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
            <SelectItem value="personal">{t("leaveTypes.personal")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
