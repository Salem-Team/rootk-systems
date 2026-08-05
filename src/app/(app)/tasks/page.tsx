"use client";

import { Suspense } from "react";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { AdminWorkAssignPanel } from "@/components/work/admin-work-assign-panel";
import { EmployeeWorkHub } from "@/components/work/employee-work-hub";
import { useSessionStore } from "@/stores/session-store";

function TasksPageContent() {
  const role = useSessionStore((s) => s.role);
  if (role === "admin") return <AdminWorkAssignPanel />;
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
