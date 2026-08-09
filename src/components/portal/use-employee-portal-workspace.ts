"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  attendanceStreak,
  personalMonthlyScore,
} from "@/components/dashboard/dashboard-mock-data";
import type { PortalSection } from "@/components/portal/portal-mock-data";
import { getAnnouncements } from "@/services/dashboard.service";
import { getMyLeaveRequests } from "@/services/leave.service";
import { getHolidays } from "@/services/schedule.service";
import { getWorkforceEmployees } from "@/services/employees.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useTranslation } from "@/hooks/use-translation";
import { computeLeaveBalance } from "@/lib/leave-balance";
import type { Announcement, Employee, Holiday, LeaveRequest } from "@/types";

const VALID_SECTIONS = new Set<PortalSection>([
  "overview",
  "profile",
  "attendance",
  "leave",
  "requests",
  "documents",
  "notifications",
  "team",
  "manager",
  "timeline",
  "events",
  "achievements",
  "stats",
]);

function parseSection(raw: string | null): PortalSection {
  if (raw && VALID_SECTIONS.has(raw as PortalSection)) {
    return raw as PortalSection;
  }
  return "overview";
}

export function useEmployeePortalWorkspace() {
  const { locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const user = useSessionStore((s) => s.user);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const todayRecord = useAttendanceStore((s) => s.todayRecord);
  const fetchTodayRecord = useAttendanceStore((s) => s.fetchTodayRecord);

  const [section, setSection] = useState<PortalSection>(() =>
    parseSection(searchParams.get("section"))
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [roster, setRoster] = useState<Employee[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSection(parseSection(searchParams.get("section")));
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    setReady(false);
    void (async () => {
      try {
        await fetchTodayRecord(workEmployeeId);
        const [annRes, leaveRes, holRes, empRes] = await Promise.all([
          getAnnouncements(),
          getMyLeaveRequests(workEmployeeId),
          getHolidays(),
          getWorkforceEmployees(),
        ]);
        if (!mounted) return;
        if (annRes.success) setAnnouncements(annRes.data.slice(0, 5));
        if (leaveRes.success) setLeaves(leaveRes.data);
        if (holRes.success) setHolidays(holRes.data);
        if (empRes.success) setRoster(empRes.data);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchTodayRecord, workEmployeeId]);

  const me = useMemo((): Employee => {
    const found = roster.find((e) => e.id === workEmployeeId);
    if (found) return found;
    return {
      id: workEmployeeId,
      employeeId: user.employeeId,
      name: user.displayName || user.firstName || user.email,
      email: user.email,
      phone: "+20 100 000 0000",
      department: "Engineering",
      position: "Employee",
      status: "active",
      joinDate: "2024-01-15",
      location: "Cairo",
      companyId: "rootk",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: 1,
      metadata: {},
    };
  }, [roster, workEmployeeId, user]);

  const manager = useMemo(() => {
    if (!me.manager) return null;
    return roster.find((e) => e.name === me.manager) ?? null;
  }, [me, roster]);

  const teammates = useMemo(() => {
    return roster.filter(
      (e) =>
        e.id !== me.id &&
        (e.manager === me.manager ||
          e.department === me.department ||
          e.manager === me.name)
    );
  }, [me, roster]);

  const balance = useMemo(() => computeLeaveBalance(leaves), [leaves]);
  const streak = useMemo(
    () => attendanceStreak(workEmployeeId),
    [workEmployeeId]
  );
  const score = useMemo(
    () => personalMonthlyScore(workEmployeeId),
    [workEmployeeId]
  );

  function changeSection(next: PortalSection) {
    setSection(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("section");
    else params.set("section", next);
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }

  return {
    user,
    dateLocale,
    todayRecord,
    section,
    changeSection,
    announcements,
    leaves,
    holidays,
    roster,
    ready,
    me,
    manager,
    teammates,
    balance,
    streak,
    score,
  };
}
