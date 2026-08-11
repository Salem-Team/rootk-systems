import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  DEFAULT_FILTERS,
  type ReportFilterValues,
} from "@/components/reports/report-filters";
import type { AnalyticsSection } from "@/components/reports/analytics-mock-data";
import { getAttendance } from "@/services/attendance.service";
import {
  getDashboardStats,
  getMonthlyStats,
  getWeeklyStats,
} from "@/services/dashboard.service";
import { getEmployeeActivityReport } from "@/services/daily-report.service";
import { getEmployees } from "@/services/employees.service";
import { todayKey } from "@/lib/mock-date";
import type {
  AttendanceRecord,
  DailyReportRow,
  DashboardStats,
  Employee,
  MonthlyStat,
  WeeklyStat,
} from "@/types";

export function useReportsData() {
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<AnalyticsSection>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStat[]>([]);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<ReportFilterValues>(DEFAULT_FILTERS);
  const [activityRows, setActivityRows] = useState<DailyReportRow[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [statsRes, weeklyRes, monthlyRes, attendanceRes, employeesRes] =
        await Promise.all([
          getDashboardStats(),
          getWeeklyStats(),
          getMonthlyStats(),
          getAttendance(),
          getEmployees(),
        ]);
      if (!mounted) return;
      if (statsRes.success) setStats(statsRes.data);
      if (weeklyRes.success) setWeekly(weeklyRes.data);
      if (monthlyRes.success) setMonthly(monthlyRes.data);
      if (attendanceRes.success) setAttendance(attendanceRes.data);
      if (employeesRes.success) setEmployees(employeesRes.data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const activityFrom = filters.range?.from
    ? format(filters.range.from, "yyyy-MM-dd")
    : todayKey();
  const activityTo = filters.range?.to
    ? format(filters.range.to, "yyyy-MM-dd")
    : activityFrom;

  useEffect(() => {
    let mounted = true;
    void getEmployeeActivityReport({ from: activityFrom, to: activityTo }).then(
      (res) => {
        if (!mounted) return;
        if (res.success) setActivityRows(res.data.rows);
      }
    );
    return () => {
      mounted = false;
    };
  }, [activityFrom, activityTo]);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const employee = employeeMap.get(record.employeeId);
      if (!employee || employee.deletedAt) return false;
      if (
        filters.department !== "all" &&
        employee.department !== filters.department
      ) {
        return false;
      }
      if (filters.status !== "all" && record.status !== filters.status) {
        return false;
      }
      if (filters.employee !== "all" && record.employeeId !== filters.employee) {
        return false;
      }
      if (
        filters.location !== "all" &&
        !employee.location.toLowerCase().includes(filters.location.toLowerCase())
      ) {
        return false;
      }
      if (filters.workMode === "remote" && record.status !== "wfh") {
        return false;
      }
      if (
        filters.workMode === "office" &&
        (record.status === "wfh" || record.status === "on_leave")
      ) {
        return false;
      }
      if (filters.workMode === "hybrid" && record.status !== "half_day") {
        return false;
      }
      if (filters.shift !== "all" && filters.shift !== "flexible") {
        const hour = record.checkIn
          ? Number(record.checkIn.match(/T(\d{2})/)?.[1] ?? Number.NaN)
          : Number.NaN;
        if (Number.isNaN(hour)) return false;
        if (filters.shift === "morning" && hour >= 14) return false;
        if (filters.shift === "evening" && hour < 14) return false;
      }
      if (filters.leaveType !== "all") {
        if (record.status !== "on_leave") return false;
        const note = (record.note ?? "").toLowerCase();
        if (!note.includes(filters.leaveType.toLowerCase())) return false;
      }
      if (filters.range?.from) {
        const from = format(filters.range.from, "yyyy-MM-dd");
        if (record.date < from) return false;
      }
      if (filters.range?.to) {
        const to = format(filters.range.to, "yyyy-MM-dd");
        if (record.date > to) return false;
      }
      return true;
    });
  }, [attendance, employeeMap, filters]);

  const filteredActivity = useMemo(() => {
    return activityRows.filter((row) => {
      if (filters.department !== "all" && row.department !== filters.department) {
        return false;
      }
      if (filters.employee !== "all" && row.employeeId !== filters.employee) {
        return false;
      }
      return true;
    });
  }, [activityRows, filters.department, filters.employee]);

  return {
    loading,
    section,
    setSection,
    stats,
    weekly,
    monthly,
    employees,
    filters,
    setFilters,
    employeeMap,
    filteredAttendance,
    filteredActivity,
  };
}
