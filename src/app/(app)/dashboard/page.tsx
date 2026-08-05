"use client";

import { PageTransition } from "@/components/shared/page-transition";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { useSessionStore } from "@/stores/session-store";

export default function DashboardPage() {
  const role = useSessionStore((s) => s.role);

  return (
    <PageTransition cascade={false}>
      {role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />}
    </PageTransition>
  );
}
