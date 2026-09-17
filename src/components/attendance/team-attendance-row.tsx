import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { formatIsoClock } from "@/lib/format-time";
import { getInitials } from "@/lib/utils";
import { locationKey, positionKey, translateOrFallback } from "@/lib/i18n-content";
import type { AttendanceRecord, Employee } from "@/types";

export function TeamAttendanceRow({
  employee,
  record,
  selected = false,
  onSelect,
}: {
  employee: Employee;
  record: AttendanceRecord | undefined;
  selected?: boolean;
  onSelect?: (employeeId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const checkInLabel = record?.checkIn
    ? `${t("attendance.checkedInAt")} ${formatIsoClock(record.checkIn, locale)}`
    : t("attendance.notCheckedIn");
  const checkOutLabel = record?.checkOut
    ? `${t("attendance.checkedOutAt")} ${formatIsoClock(record.checkOut, locale)}`
    : null;

  return (
    <motion.li variants={fadeInUp}>
      <button
        type="button"
        onClick={() => onSelect?.(employee.id)}
        aria-pressed={selected}
        className={`group list-row flex w-full flex-col gap-3 p-3 text-start transition-colors sm:flex-row sm:items-center sm:justify-between ${
          selected
            ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/30"
            : "hover:bg-muted/40"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 border border-border transition-transform duration-200 group-hover:scale-[1.04]">
            {employee.avatar ? <AvatarImage src={employee.avatar} alt="" /> : null}
            <AvatarFallback className="bg-primary/[0.08] text-[11px] font-semibold text-primary">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{employee.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {translateOrFallback(t, positionKey(employee.position), employee.position)}{" "}
              ·{" "}
              {translateOrFallback(t, locationKey(employee.location), employee.location)}
            </p>
            <div className="mt-1.5">
              <DepartmentBadge department={employee.department} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <div className="text-xs text-muted-foreground">
            <p>{checkInLabel}</p>
            {checkOutLabel ? <p className="mt-0.5">{checkOutLabel}</p> : null}
          </div>
          <StatusBadge status={record?.status ?? "absent"} />
        </div>
      </button>
    </motion.li>
  );
}
