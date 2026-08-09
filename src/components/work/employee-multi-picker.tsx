"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
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
}: {
  employees: Employee[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label: string;
  /** IDs that cannot be deselected (e.g. meeting organizer / self). */
  lockedIds?: string[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);

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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">
          {t("workAdmin.selectedCount", { count: selectedIds.length })}
        </p>
      </div>
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
      <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-muted/10 p-2">
        {filtered.map((emp) => {
          const checked = selectedIds.includes(emp.id);
          return (
            <label
              key={emp.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/50",
                checked && "bg-primary/[0.07]"
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
                <span className="block truncate font-medium">{emp.name}</span>
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
