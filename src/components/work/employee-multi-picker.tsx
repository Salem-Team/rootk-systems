"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

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

export function EmployeeAvatarStack({
  employees,
  ids,
  max = 4,
}: {
  employees: Map<string, Employee>;
  ids: string[];
  max?: number;
}) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2 rtl:space-x-reverse">
        {shown.map((id) => {
          const emp = employees.get(id);
          return (
            <Avatar
              key={id}
              className="h-6 w-6 border-2 border-card"
              title={emp?.name ?? id}
            >
              <AvatarFallback className="text-[9px]">
                {initials(emp?.name ?? id)}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      {extra > 0 ? (
        <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

/** Named assignee chips — click to filter; overflow opens a picker. */
export function TaskAssignees({
  employees,
  ids,
  selectedId,
  onSelect,
  maxVisible = 3,
  label,
  pickLabel,
}: {
  employees: Map<string, Employee>;
  ids: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  maxVisible?: number;
  label?: string;
  pickLabel?: string;
}) {
  const interactive = Boolean(onSelect);
  const shown = ids.slice(0, maxVisible);
  const overflow = ids.slice(maxVisible);

  function handleSelect(id: string) {
    if (!onSelect) return;
    onSelect(selectedId === id ? "" : id);
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {label ? (
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}
      {shown.map((id) => {
        const emp = employees.get(id);
        const name = emp?.name ?? id;
        const active = selectedId === id;
        const className = cn(
          "inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[12px] transition-colors",
          active
            ? "border-primary/30 bg-primary/[0.1] font-medium text-primary"
            : "border-border/70 bg-muted/30 text-foreground/85",
          interactive &&
            !active &&
            "hover:border-border hover:bg-muted/60 hover:text-foreground",
          interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        );

        const content = (
          <>
            <Avatar className="h-5 w-5 shrink-0 border border-background">
              <AvatarFallback className="text-[8px]">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{name}</span>
          </>
        );

        if (!interactive) {
          return (
            <span key={id} className={className} title={name}>
              {content}
            </span>
          );
        }

        return (
          <button
            key={id}
            type="button"
            onClick={() => handleSelect(id)}
            className={className}
            title={name}
            aria-pressed={active}
          >
            {content}
          </button>
        );
      })}

      {overflow.length > 0 ? (
        interactive ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <Users className="h-3 w-3" aria-hidden />
                +{overflow.length}
                {pickLabel ? (
                  <span className="hidden sm:inline">{pickLabel}</span>
                ) : null}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <p className="mb-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {label ?? pickLabel}
              </p>
              <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                {ids.map((id) => {
                  const emp = employees.get(id);
                  const name = emp?.name ?? id;
                  const active = selectedId === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors",
                          active
                            ? "bg-primary/[0.1] font-medium text-primary"
                            : "hover:bg-muted/60"
                        )}
                        aria-pressed={active}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[9px]">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                        {emp?.department ? (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {emp.department}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground">
            +{overflow.length}
          </span>
        )
      ) : null}
    </div>
  );
}
