import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { getInitials } from "@/lib/utils";
import { locationKey, positionKey, translateOrFallback } from "@/lib/i18n-content";
import type { AttendanceRecord, Employee } from "@/types";

export function TeamAttendanceRow({
  employee,
  record,
}: {
  employee: Employee;
  record: AttendanceRecord | undefined;
}) {
  const { t } = useTranslation();

  return (
    <motion.li
      variants={fadeInUp}
      className="group list-row flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
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
          {record?.checkIn
            ? `${t("attendance.checkedInAt")} ${new Date(record.checkIn).toLocaleTimeString(
                [],
                { hour: "2-digit", minute: "2-digit" }
              )}`
            : t("attendance.notCheckedIn")}
        </div>
        <StatusBadge status={record?.status ?? "absent"} />
      </div>
    </motion.li>
  );
}
