"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { getTodayAttendance } from "@/services/attendance.service";
import { getWorkforceEmployees } from "@/services/employees.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getInitials } from "@/lib/utils";
import {
  locationKey,
  positionKey,
  translateOrFallback,
} from "@/lib/i18n-content";
import type { AttendanceRecord, AttendanceStatus, Employee } from "@/types";

type BoardFilter = "all" | "present" | "late" | "wfh" | "absent" | "on_leave";

function matchesFilter(status: AttendanceStatus, filter: BoardFilter) {
  if (filter === "all") return true;
  if (filter === "present") {
    return (
      status === "present" || status === "early_leave" || status === "half_day"
    );
  }
  return status === filter;
}

export function TeamAttendanceBoard() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [empRes, attRes] = await Promise.all([
        getWorkforceEmployees(),
        getTodayAttendance(),
      ]);
      if (!mounted) return;
      if (empRes.success) setEmployees(empRes.data);
      if (attRes.success) setAttendance(attRes.data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const attendanceMap = useMemo(
    () =>
      attendance.reduce<Record<string, AttendanceRecord>>((acc, record) => {
        acc[record.employeeId] = record;
        return acc;
      }, {}),
    [attendance]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .map((employee) => ({
        employee,
        record: attendanceMap[employee.id],
      }))
      .filter(({ employee, record }) => {
        const status = record?.status ?? "absent";
        if (!matchesFilter(status, filter)) return false;
        if (!q) return true;
        return (
          employee.name.toLowerCase().includes(q) ||
          employee.employeeId.toLowerCase().includes(q) ||
          employee.department.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name));
  }, [attendanceMap, employees, filter, query]);

  const counts = useMemo(() => {
    const base = {
      all: employees.length,
      present: 0,
      late: 0,
      wfh: 0,
      absent: 0,
      on_leave: 0,
    };
    for (const employee of employees) {
      const status = attendanceMap[employee.id]?.status ?? "absent";
      if (
        status === "present" ||
        status === "early_leave" ||
        status === "half_day"
      ) {
        base.present += 1;
      } else if (status === "late") base.late += 1;
      else if (status === "wfh") base.wfh += 1;
      else if (status === "on_leave") base.on_leave += 1;
      else base.absent += 1;
    }
    return base;
  }, [attendanceMap, employees]);

  const quickStats = [
    {
      key: "present" as const,
      label: t("attendance.whoPresent"),
      value: counts.present,
      tone: "border-emerald-500/20 bg-emerald-500/[0.06]",
    },
    {
      key: "late" as const,
      label: t("attendance.whoLate"),
      value: counts.late,
      tone: "border-amber-500/20 bg-amber-500/[0.06]",
    },
    {
      key: "absent" as const,
      label: t("attendance.whoAbsent"),
      value: counts.absent,
      tone: "border-rose-500/20 bg-rose-500/[0.06]",
    },
    {
      key: "wfh" as const,
      label: t("attendance.whoWfh"),
      value: counts.wfh,
      tone: "border-sky-500/20 bg-sky-500/[0.06]",
    },
  ];

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-[0.95rem] font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" aria-hidden />
              {t("attendance.teamBoard")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("attendance.teamBoardDesc")}</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("employees.searchPlaceholder")}
              className="ps-9"
              aria-label={t("common.searchAria")}
            />
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {quickStats.map((stat) => (
            <motion.button
              key={stat.key}
              type="button"
              variants={fadeInUp}
              onClick={() => setFilter(stat.key)}
              className={`rounded-xl border px-3.5 py-3 text-start transition-all hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${stat.tone} ${
                filter === stat.key ? "ring-2 ring-primary/30" : ""
              }`}
              aria-pressed={filter === stat.key}
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <p className="section-label">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                <AnimatedCounter value={stat.value} />
              </p>
            </motion.button>
          ))}
        </motion.div>
      </div>
      <div className="panel-body">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as BoardFilter)}
        >
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
            {(
              [
                ["all", counts.all],
                ["present", counts.present],
                ["late", counts.late],
                ["wfh", counts.wfh],
                ["absent", counts.absent],
                ["on_leave", counts.on_leave],
              ] as const
            ).map(([key, count]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                {key === "all" ? t("common.all") : t(`status.${key}`)}
                <span className="rounded-md bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px]">
                  {count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={filter} className="mt-0">
            {loading ? (
              <div className="space-y-3" aria-busy="true" aria-label={t("common.loading")}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative h-16 overflow-hidden rounded-xl border border-border/40 bg-muted/60 before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/10"
                  />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                compact
                title={t("common.noResults")}
                description={t("employees.emptyDesc")}
              />
            ) : (
              <motion.ul
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {rows.map(({ employee, record }) => (
                  <motion.li
                    key={employee.id}
                    variants={fadeInUp}
                    className="group list-row flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border transition-transform duration-200 group-hover:scale-[1.04]">
                        {employee.avatar ? (
                          <AvatarImage src={employee.avatar} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-primary/[0.08] text-[11px] font-semibold text-primary">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{employee.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {translateOrFallback(
                            t,
                            positionKey(employee.position),
                            employee.position
                          )}{" "}
                          ·{" "}
                          {translateOrFallback(
                            t,
                            locationKey(employee.location),
                            employee.location
                          )}
                        </p>
                        <div className="mt-1.5">
                          <DepartmentBadge department={employee.department} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <div className="text-xs text-muted-foreground">
                        {record?.checkIn
                          ? `${t("attendance.checkedInAt")} ${new Date(
                              record.checkIn
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : t("attendance.notCheckedIn")}
                      </div>
                      <StatusBadge status={record?.status ?? "absent"} />
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
