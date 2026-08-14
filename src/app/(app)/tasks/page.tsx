"use client";

import { Suspense } from "react";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { AdminWorkAssignPanel } from "@/components/work/admin-work-assign-panel";
import { EmployeeWorkHub } from "@/components/work/employee-work-hub";
import { useHasAnyPermission } from "@/hooks/use-permission";

function TasksPageContent() {
  const showAssignPanel = useHasAnyPermission([
    "tasks.viewAll",
    "tasks.assign",
    "tasks.editOthers",
  ]);
  if (showAssignPanel) return <AdminWorkAssignPanel />;
  return <EmployeeWorkHub />;
}

export default function TasksPage() {
  return (
    <PageTransition cascade={false}>
      <Suspense fallback={<PageSkeleton />}>
        <TasksPageContent />
      </Suspense>
    </PageTransition>
  );
}
