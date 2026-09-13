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
import { TeamManagerPicker } from "@/components/team/team-manager-picker";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";

export function TeamMembersTable({
  members,
  managerOptions,
  canReassignManagers,
  managerBusyId,
  openTaskCountByEmployee,
  targetCounts,
  onAssignManagers,
  onAssignTask,
  onAssignTarget,
}: {
  members: Employee[];
  managerOptions: Employee[];
  canReassignManagers: boolean;
  managerBusyId: string | null;
  openTaskCountByEmployee: Map<string, number>;
  targetCounts: Map<string, number>;
  onAssignManagers: (employeeId: string, managerEmployeeIds: string[]) => void;
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
      <ul className="grid gap-2.5 p-3 md:hidden">
        {members.map((member) => (
          <li key={member.id} className="list-row px-3.5 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug">
                  {member.name}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {member.position}
                  {member.department ? ` · ${member.department}` : ""}
                </p>
              </div>
            </div>
            {canReassignManagers ? (
              <div className="mt-2.5">
                <TeamManagerPicker
                  member={member}
                  options={managerOptions.filter((m) => m.id !== member.id)}
                  disabled={managerBusyId === member.id}
                  onSave={(ids) => onAssignManagers(member.id, ids)}
                />
              </div>
            ) : null}
            <dl className="mt-2.5 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-muted/55 px-2.5 py-2">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("team.colOpenTasks")}
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold">
                  {openTaskCountByEmployee.get(member.id) ?? 0}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/55 px-2.5 py-2">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("team.colTargets")}
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold">
                  {targetCounts.get(member.id) ?? 0}
                </dd>
              </div>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 w-full"
                onClick={() => onAssignTask(member)}
              >
                <ListTodo className="h-3.5 w-3.5" />
                {t("team.assignTask")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 w-full"
                onClick={() => onAssignTarget(member)}
              >
                <Target className="h-3.5 w-3.5" />
                {t("team.assignTarget")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <DataTable embedded className="min-w-[44rem]">
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead className="h-11">{t("team.colMember")}</DataTableHead>
              <DataTableHead className="hidden h-11 md:table-cell">
                {t("common.department")}
              </DataTableHead>
              {canReassignManagers ? (
                <DataTableHead className="h-11">
                  {t("employees.managers")}
                </DataTableHead>
              ) : null}
              <DataTableHead className="h-11">
                {t("team.colOpenTasks")}
              </DataTableHead>
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
                {canReassignManagers ? (
                  <DataTableCell
                    className="py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TeamManagerPicker
                      member={member}
                      options={managerOptions.filter((m) => m.id !== member.id)}
                      disabled={managerBusyId === member.id}
                      onSave={(ids) => onAssignManagers(member.id, ids)}
                    />
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
      </div>
    </section>
  );
}
