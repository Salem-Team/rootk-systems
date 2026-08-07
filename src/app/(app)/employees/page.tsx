"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import {
  CardGridSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-state";
import {
  EmployeeFilters,
  type EmployeeFilterValues,
  type EmployeeSort,
} from "@/components/employees/employee-filters";
import { EmployeeGrid } from "@/components/employees/employee-grid";
import { EmployeeTable } from "@/components/employees/employee-table";
import { EmployeeProfileDrawer } from "@/components/employees/employee-profile-drawer";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { Button } from "@/components/ui/button";
import { getTodayAttendance } from "@/services/attendance.service";
import { getEmployees } from "@/services/employees.service";
import { RoleGate } from "@/components/shared/role-gate";
import { useUiStore } from "@/stores/ui-store";
import { useTranslation } from "@/hooks/use-translation";
import type { AttendanceRecord, Employee } from "@/types";

const DEFAULT_FILTERS: EmployeeFilterValues = {
  query: "",
  department: "all",
  status: "all",
  sort: "name_asc",
};

function sortEmployees(list: Employee[], sort: EmployeeSort): Employee[] {
  const next = [...list];
  switch (sort) {
    case "name_desc":
      return next.sort((a, b) => b.name.localeCompare(a.name));
    case "department":
      return next.sort(
        (a, b) =>
          a.department.localeCompare(b.department) ||
          a.name.localeCompare(b.name)
      );
    case "join_date":
      return next.sort((a, b) => b.joinDate.localeCompare(a.joinDate));
    case "name_asc":
    default:
      return next.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export default function EmployeesPage() {
  const { t } = useTranslation();
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  const [filters, setFilters] = useState<EmployeeFilterValues>(DEFAULT_FILTERS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roster, setRoster] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const skipFilterFetch = useRef(true);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  /** Always reload from API/DB — never treat local React state as source of truth. */
  const reloadEmployees = useCallback(async () => {
    const current = filtersRef.current;
    const [empRes, rosterRes] = await Promise.all([
      getEmployees({
        query: current.query || undefined,
        department:
          current.department === "all" ? undefined : current.department,
        status: current.status === "all" ? undefined : current.status,
      }),
      getEmployees(),
    ]);
    if (empRes.success) setEmployees(empRes.data);
    if (rosterRes.success) setRoster(rosterRes.data);
    setSelected((curr) => {
      if (!curr) return null;
      const source = rosterRes.success ? rosterRes.data : empRes.success ? empRes.data : [];
      return source.find((e) => e.id === curr.id) ?? null;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [empRes, attRes] = await Promise.all([
        getEmployees(),
        getTodayAttendance(),
      ]);
      if (!mounted) return;
      if (empRes.success) {
        setEmployees(empRes.data);
        setRoster(empRes.data);
      }
      if (attRes.success) setAttendance(attRes.data);
      setInitialLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (skipFilterFetch.current) {
      skipFilterFetch.current = false;
      return;
    }

    let mounted = true;
    startTransition(() => {
      void (async () => {
        await reloadEmployees();
        if (!mounted) return;
      })();
    });

    return () => {
      mounted = false;
    };
  }, [filters.query, filters.department, filters.status, startTransition, reloadEmployees]);

  const attendanceByEmployee = useMemo(() => {
    return attendance.reduce<Record<string, AttendanceRecord>>((acc, record) => {
      acc[record.employeeId] = record;
      return acc;
    }, {});
  }, [attendance]);

  const displayed = useMemo(
    () =>
      sortEmployees(
        employees.filter((e) => !e.deletedAt),
        filters.sort
      ),
    [employees, filters.sort]
  );

  const openEmployee = (employee: Employee) => {
    setSelected(employee);
    setDrawerOpen(true);
  };

  async function handleSaved() {
    await reloadEmployees();
    setEditing(null);
  }

  async function handleDeleted(id: string) {
    await reloadEmployees();
    if (selected?.id === id) {
      setSelected(null);
      setDrawerOpen(false);
    }
    setEditing(null);
  }

  if (initialLoading) {
    return <PageSkeleton />;
  }

  return (
    <RoleGate allow={["admin"]}>
      <PageTransition>
        <PageHeader
          title={t("employees.title")}
          description={t("employees.description")}
          actions={
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 bg-[#082868] text-white shadow-[0_10px_24px_rgba(8,40,104,0.28)] hover:bg-[#0a327c] sm:w-auto"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("employees.addEmployee")}
            </Button>
          }
        />
        <div className="space-y-6">
          <EmployeeFilters
            values={filters}
            viewMode={viewMode}
            onChange={setFilters}
            onViewModeChange={setViewMode}
          />

          {isPending ? (
            viewMode === "grid" ? (
              <CardGridSkeleton count={6} />
            ) : (
              <TableSkeleton rows={6} />
            )
          ) : viewMode === "grid" ? (
            <EmployeeGrid
              employees={displayed}
              attendanceByEmployee={attendanceByEmployee}
              onSelect={openEmployee}
            />
          ) : (
            <EmployeeTable
              employees={displayed}
              attendanceByEmployee={attendanceByEmployee}
              onSelect={openEmployee}
            />
          )}

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("employees.showingCount", { count: displayed.length })}
          </p>
        </div>

        <EmployeeProfileDrawer
          employee={selected}
          roster={roster.filter((e) => !e.deletedAt)}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onSelectEmployee={openEmployee}
          onEditEmployee={(employee) => {
            setEditing(employee);
            setFormOpen(true);
          }}
          onDeleted={(id) => {
            void handleDeleted(id);
          }}
        />

        <EmployeeFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          employee={editing}
          roster={roster.filter((e) => !e.deletedAt)}
          onSaved={() => {
            void handleSaved();
          }}
          onDeleted={(id) => {
            void handleDeleted(id);
          }}
        />
      </PageTransition>
    </RoleGate>
  );
}
