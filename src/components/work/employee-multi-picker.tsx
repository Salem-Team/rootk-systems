"use client";

import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import { initials } from "./employee-avatar-initials";

export { EmployeeAvatarStack } from "./employee-avatar-stack";
export { TaskAssignees } from "./task-assignees";

/** Searchable multi-select list of employees for task/meeting assignment. */
export function EmployeeMultiPicker({
  employees,
  selectedIds,
  onChange,
  label,
  lockedIds = [],
  className,
  listClassName,
}: {
  employees: Employee[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label: string;
  /** IDs that cannot be deselected (e.g. meeting organizer / self). */
  lockedIds?: string[];
  className?: string;
  listClassName?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);

  const byId = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e]));
    return map;
  }, [employees]);

  const selectedEmployees = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id))
        .filter((e): e is Employee => Boolean(e)),
    [byId, selectedIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    );
  }, [employees, query]);

  function toggle(id: string) {
    if (locked.has(id) && selectedIds.includes(id)) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function selectAllVisible() {
    const ids = new Set([...selectedIds, ...filtered.map((e) => e.id)]);
    onChange(Array.from(ids));
  }

  function clearAll() {
    onChange(selectedIds.filter((id) => locked.has(id)));
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {t("workAdmin.selectedCount", { count: selectedIds.length })}
        </p>
      </div>

      {selectedEmployees.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedEmployees.map((emp) => {
            const isLocked = locked.has(emp.id);
            return (
              <button
                key={emp.id}
                type="button"
                disabled={isLocked}
                onClick={() => toggle(emp.id)}
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.08] py-1 pe-1.5 ps-1 text-[11px] font-medium text-foreground transition-colors",
                  isLocked
                    ? "cursor-default opacity-80"
                    : "hover:border-primary/35 hover:bg-primary/[0.12]"
                )}
                aria-label={
                  isLocked
                    ? emp.name
                    : `${t("workAdmin.clearSelection")}: ${emp.name}`
                }
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">
                    {initials(emp.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{emp.name}</span>
                {!isLocked ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-card/80 text-muted-foreground">
                    <X className="h-2.5 w-2.5" aria-hidden />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("workAdmin.searchPeople")}
          className="h-9 ps-8"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={selectAllVisible}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          {t("workAdmin.selectVisible")}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-[11px] font-medium text-muted-foreground hover:underline"
        >
          {t("workAdmin.clearSelection")}
        </button>
      </div>
      <div
        className={cn(
          "max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-border/70 bg-card/60 p-1.5",
          listClassName
        )}
      >
        {filtered.map((emp) => {
          const checked = selectedIds.includes(emp.id);
          return (
            <label
              key={emp.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/55",
                checked && "bg-primary/[0.08] ring-1 ring-inset ring-primary/15"
              )}
            >
              <input
                type="checkbox"
                className="accent-[var(--primary)]"
                checked={checked}
                disabled={locked.has(emp.id) && checked}
                onChange={() => toggle(emp.id)}
              />
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {initials(emp.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-tight">
                  {emp.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {emp.department} · {emp.position}
                </span>
              </span>
            </label>
          );
        })}
        {filtered.length === 0 ? (
          <p className="flex items-center justify-center gap-1.5 px-2 py-6 text-[12px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {t("common.noResults")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
