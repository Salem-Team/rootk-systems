"use client";

import { PageTransition } from "@/components/shared/page-transition";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { useHasPermission } from "@/hooks/use-permission";

export default function DashboardPage() {
  const showCompanyDashboard = useHasPermission("dashboard.viewCompanyStats");

  return (
    <PageTransition cascade={false}>
      {showCompanyDashboard ? <AdminDashboard /> : <EmployeeDashboard />}
    </PageTransition>
  );
}
