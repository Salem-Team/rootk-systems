"use client";

import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmployeePortalWorkspace } from "@/components/portal/employee-portal-workspace";

/** Employee self-service portal — wraps workspace in Suspense for searchParams. */
export function EmployeeDashboard() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EmployeePortalWorkspace />
    </Suspense>
  );
}
