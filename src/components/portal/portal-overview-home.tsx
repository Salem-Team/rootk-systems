import { format } from "date-fns";
import type { enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import { Flame, Gauge, Plane } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { sparklineFor } from "@/components/dashboard/dashboard-mock-data";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmployeeDailyWorkspace } from "@/components/operations/employee-daily-workspace";
import { EmployeeOverviewHero } from "@/components/portal/employee-overview-hero";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { demoNow } from "@/lib/mock-date";
import type {
  Announcement,
  AttendanceRecord,
  Employee,
  Holiday,
  LeaveRequest,
} from "@/types";

export function OverviewHome({
  streak,
  score,
  balance,
  todayRecord,
  dateLocale,
  announcements,
  holidays,
  leaves,
  employees,
}: {
  streak: number;
  score: number;
  balance: { remaining: number; used: number; pending: number };
  todayRecord: AttendanceRecord | null;
  dateLocale: typeof enUS;
  announcements: Announcement[];
  holidays: Holiday[];
  leaves: LeaveRequest[];
  employees: Employee[];
  manager: Employee | null;
  teammates: Employee[];
}) {
  const { t } = useTranslation();

  return (
    <>
      <EmployeeOverviewHero
        streak={streak}
        score={score}
        leaveRemaining={balance.remaining}
        todayRecord={todayRecord}
      />

      <motion.div
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="hidden grid-cols-2 gap-3 sm:grid xl:grid-cols-4"
      >
        <motion.div variants={fadeInUp}>
          <KpiCard
            label={t("employeeHome.attendanceStreak")}
            value={streak}
            icon={Flame}
            tone="text-orange-700 dark:text-orange-400"
            spark={sparklineFor(`streak-portal`)}
            badge={t("employeeHome.days")}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <KpiCard
            label={t("employeeHome.monthlyScore")}
            value={score}
            suffix="%"
            icon={Gauge}
            tone="text-teal-800 dark:text-teal-300"
            spark={sparklineFor(`score-portal`)}
            trend={2}
          />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <KpiCard
            label={t("employeeHome.leaveRemaining")}
            value={balance.remaining}
            icon={Plane}
            tone="text-sky-700 dark:text-sky-400"
            spark={sparklineFor(`leave-portal`)}
          />
        </motion.div>
        <motion.div
          variants={fadeInUp}
          className="surface-panel flex flex-col justify-between px-4 py-3.5"
        >
          <p className="section-label">{t("employeeHome.myStatus")}</p>
          <div className="mt-2">
            {todayRecord ? (
              <StatusBadge status={todayRecord.status} />
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("attendance.notCheckedIn")}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {format(demoNow(), "EEEE, MMM d", { locale: dateLocale })}
          </p>
        </motion.div>
      </motion.div>

      <EmployeeDailyWorkspace
        todayRecord={todayRecord}
        announcements={announcements}
        holidays={holidays}
        leaves={leaves}
        employees={employees}
      />
    </>
  );
}
