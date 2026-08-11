"use client";

import { Search, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/loading-state";
import { Input } from "@/components/ui/input";
import { TeamMembersTable } from "@/components/team/team-members-table";
import { useTeamPage } from "@/components/team/use-team-page";
import { AdminWorkTaskDialog } from "@/components/work/admin-work-task-dialog";
import { TargetAssignSheet } from "@/components/targets/target-assign-sheet";

export function TeamPage() {
  const page = useTeamPage();

  if (!page.ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={page.t("team.eyebrow")}
        title={page.t("team.title")}
        description={
          page.isAdmin ? page.t("team.adminDesc") : page.t("team.managerDesc")
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={page.query}
            onChange={(e) => page.setQuery(e.target.value)}
            placeholder={page.t("team.search")}
            className="h-10 rounded-xl ps-9"
          />
        </div>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <UsersRound className="h-3.5 w-3.5" />
          {page.t("team.memberCount", { count: String(page.reports.length) })}
        </p>
      </div>

      <TeamMembersTable
        members={page.visible}
        managerOptions={page.managerOptions}
        isAdmin={page.isAdmin}
        managerBusyId={page.managerBusyId}
        openTaskCountByEmployee={page.openTaskCountByEmployee}
        targetCounts={page.targetCounts}
        onAssignManager={(id, managerId) => void page.assignManager(id, managerId)}
        onAssignTask={page.openAssignTask}
        onAssignTarget={page.openAssignTarget}
      />

      <AdminWorkTaskDialog
        open={page.taskOpen}
        onOpenChange={page.setTaskOpen}
        isEditing={false}
        busy={page.taskBusy}
        taskForm={page.taskForm}
        setTaskForm={page.setTaskForm}
        employees={page.isAdmin ? page.employees : page.reports}
        meetings={[]}
        onSave={() => void page.saveTask()}
      />

      <TargetAssignSheet
        open={page.targetOpen}
        onOpenChange={page.setTargetOpen}
        categories={page.categories}
        types={page.types}
        employees={page.isAdmin ? page.employees : page.reports}
        defaultAssigneeIds={page.targetAssignees}
        onSaved={() => {
          page.setTargetOpen(false);
          void page.reload();
        }}
      />
    </>
  );
}
