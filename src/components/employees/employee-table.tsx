"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { EmployeePerformanceButton } from "@/components/employees/employee-performance-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { positionKey, translateOrFallback } from "@/lib/i18n-content";
import { getInitials } from "@/lib/utils";
import type { AttendanceRecord, Employee } from "@/types";

interface EmployeeTableProps {
  employees: Employee[];
  attendanceByEmployee?: Record<string, AttendanceRecord>;
  onSelect?: (employee: Employee) => void;
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (sorted === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
}

export function EmployeeTable({
  employees,
  attendanceByEmployee = {},
  onSelect,
}: EmployeeTableProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("common.name"),
        cell: ({ row }) => {
          const employee = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-border transition-transform duration-200 group-hover:scale-[1.04]">
                {employee.avatar ? (
                  <AvatarImage src={employee.avatar} alt={employee.name} />
                ) : null}
                <AvatarFallback className="bg-primary/[0.08] text-[11px] font-semibold text-primary">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{employee.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {employee.employeeId}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "department",
        header: t("common.department"),
        cell: ({ row }) => (
          <DepartmentBadge department={row.original.department} />
        ),
      },
      {
        accessorKey: "position",
        header: t("common.position"),
        cell: ({ getValue }) => {
          const position = String(getValue());
          return (
            <span className="text-muted-foreground">
              {translateOrFallback(t, positionKey(position), position)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ getValue }) => (
          <StatusBadge status={getValue() as Employee["status"]} />
        ),
      },
      {
        id: "today",
        header: t("employees.currentAttendance"),
        enableSorting: false,
        cell: ({ row }) => {
          const record = attendanceByEmployee[row.original.id];
          return record ? (
            <StatusBadge status={record.status} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "actions",
        header: t("common.actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <EmployeePerformanceButton
            employee={row.original}
            size="sm"
            variant="outline"
          />
        ),
      },
    ],
    [attendanceByEmployee, t]
  );

  const table = useReactTable({
    data: employees,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (employees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("employees.empty")}
        description={t("employees.emptyDesc")}
      />
    );
  }

  return (
    <Card className="overflow-hidden transition-[box-shadow,border-color] duration-200 hover:border-primary/15 hover:shadow-[var(--shadow-card-hover)]">
      <CardContent className="p-0">
        <ul className="grid gap-2 p-3 md:hidden">
          {employees.map((employee) => {
            const record = attendanceByEmployee[employee.id];
            return (
              <li key={employee.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(employee)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-start"
                >
                  <Avatar className="h-10 w-10 border border-border">
                    {employee.avatar ? (
                      <AvatarImage src={employee.avatar} alt={employee.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/[0.08] text-[11px] font-semibold text-primary">
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {employee.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {employee.employeeId}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <DepartmentBadge department={employee.department} />
                      <StatusBadge status={employee.status} />
                      {record ? <StatusBadge status={record.status} /> : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="table-scroll hidden md:block">
          <table
            className="w-full min-w-[36rem] text-start text-sm md:min-w-[640px]"
            aria-label={t("employees.title")}
          >
            <thead className="border-b border-border/70 bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : canSort
                                ? "none"
                                : undefined
                        }
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-ms-2 h-8 gap-1.5 px-2 font-medium text-muted-foreground hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                            aria-label={`${String(header.column.columnDef.header)}`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            <SortIcon sorted={sorted} />
                          </Button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  role={onSelect ? "button" : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  onClick={() => onSelect?.(row.original)}
                  onKeyDown={(e) => {
                    if (!onSelect) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(row.original);
                    }
                  }}
                  className="group border-b border-border/40 last:border-0 transition-colors hover:bg-primary/[0.04] focus-visible:bg-primary/[0.04] focus-visible:outline-none cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
