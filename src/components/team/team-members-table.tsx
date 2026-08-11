"use client";

import { ListTodo, Target } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NONE_MANAGER } from "@/components/employees/employee-form.schema";
import { useTranslation } from "@/hooks/use-translation";
import { managerIdOf } from "@/lib/team";
import type { Employee } from "@/types";

export function TeamMembersTable({
  members,
  managerOptions,
  isAdmin,
  managerBusyId,
  openTaskCountByEmployee,
  targetCounts,
  onAssignManager,
  onAssignTask,
  onAssignTarget,
}: {
  members: Employee[];
  managerOptions: Employee[];
  isAdmin: boolean;
  managerBusyId: string | null;
  openTaskCountByEmployee: Map<string, number>;
  targetCounts: Map<string, number>;
  onAssignManager: (employeeId: string, managerEmployeeId: string) => void;
  onAssignTask: (employee: Employee) => void;
  onAssignTarget: (employee: Employee) => void;
}) {
  const { t } = useTranslation();

  if (members.length === 0) {
    return (
      <EmptyState
        title={t("team.empty")}
        description={t("team.emptyDesc")}
      />
    );
  }

  return (
    <section className="surface-panel overflow-hidden">
      <DataTable embedded className="min-w-[44rem]">
        <DataTableHeader>
          <DataTableHeaderRow>
            <DataTableHead className="h-11">{t("team.colMember")}</DataTableHead>
            <DataTableHead className="hidden h-11 md:table-cell">
              {t("common.department")}
            </DataTableHead>
            {isAdmin ? (
              <DataTableHead className="h-11">{t("employees.manager")}</DataTableHead>
            ) : null}
            <DataTableHead className="h-11">{t("team.colOpenTasks")}</DataTableHead>
            <DataTableHead className="hidden h-11 sm:table-cell">
              {t("team.colTargets")}
            </DataTableHead>
            <DataTableHead className="h-11 text-end">
              {t("common.actions")}
            </DataTableHead>
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {members.map((member, index) => (
            <DataTableRow
              key={member.id}
              className={index % 2 === 1 ? "bg-muted/25" : undefined}
            >
              <DataTableCell className="py-4">
                <p className="text-[13px] font-semibold">{member.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {member.position}
                </p>
              </DataTableCell>
              <DataTableCell className="hidden py-4 text-[13px] md:table-cell">
                {member.department}
              </DataTableCell>
              {isAdmin ? (
                <DataTableCell
                  className="py-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={managerIdOf(member) || NONE_MANAGER}
                    disabled={managerBusyId === member.id}
                    onValueChange={(v) =>
                      onAssignManager(
                        member.id,
                        v === NONE_MANAGER ? "" : v
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-[min(100%,220px)]">
                      <SelectValue placeholder={t("employees.noManager")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_MANAGER}>
                        {t("employees.noManager")}
                      </SelectItem>
                      {managerOptions
                        .filter((m) => m.id !== member.id)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </DataTableCell>
              ) : null}
              <DataTableCell className="py-4 font-mono text-[13px]">
                {openTaskCountByEmployee.get(member.id) ?? 0}
              </DataTableCell>
              <DataTableCell className="hidden py-4 font-mono text-[13px] sm:table-cell">
                {targetCounts.get(member.id) ?? 0}
              </DataTableCell>
              <DataTableCell className="py-4">
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onAssignTask(member)}
                  >
                    <ListTodo className="h-3.5 w-3.5" />
                    {t("team.assignTask")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onAssignTarget(member)}
                  >
                    <Target className="h-3.5 w-3.5" />
                    {t("team.assignTarget")}
                  </Button>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </section>
  );
}
