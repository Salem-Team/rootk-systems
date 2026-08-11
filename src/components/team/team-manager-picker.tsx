"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import { useTranslation } from "@/hooks/use-translation";
import { managerIdsOf, sameIdSet } from "@/lib/team";
import type { Employee } from "@/types";

export function TeamManagerPicker({
  member,
  options,
  disabled,
  onSave,
}: {
  member: Employee;
  options: Employee[];
  disabled?: boolean;
  onSave: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const currentIds = managerIdsOf(member);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(currentIds);

  const optionMap = useMemo(
    () => new Map(options.map((row) => [row.id, row])),
    [options]
  );
  const shownIds = open ? draft : currentIds;
  const label = useMemo(() => {
    if (shownIds.length === 0) return t("employees.noManager");
    const first = optionMap.get(shownIds[0])?.name ?? shownIds[0];
    if (shownIds.length === 1) return first;
    return t("team.managersSelected", {
      name: first,
      count: String(shownIds.length - 1),
    });
  }, [shownIds, optionMap, t]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(currentIds);
      setOpen(true);
      return;
    }
    setOpen(false);
    if (!sameIdSet(draft, currentIds)) onSave(draft);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-9 w-full max-w-full justify-between px-2.5 font-normal sm:w-[min(100%,16rem)]"
        >
          <span className="truncate text-start text-[13px]">{label}</span>
          <ChevronsUpDown className="ms-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(calc(100dvw-2rem),22rem)] p-3"
      >
        <EmployeeMultiPicker
          employees={options}
          selectedIds={draft}
          onChange={setDraft}
          label={t("employees.managers")}
        />
      </PopoverContent>
    </Popover>
  );
}
