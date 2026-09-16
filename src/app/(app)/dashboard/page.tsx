"use client";

import dynamic from "next/dynamic";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { useHasPermission } from "@/hooks/use-permission";

const AdminDashboard = dynamic(
  () =>
    import("@/components/dashboard/admin-dashboard").then(
      (m) => m.AdminDashboard
    ),
  { loading: () => <PageSkeleton /> }
);

const EmployeeDashboard = dynamic(
  () =>
    import("@/components/dashboard/employee-dashboard").then(
      (m) => m.EmployeeDashboard
    ),
  { loading: () => <PageSkeleton /> }
);

export default function DashboardPage() {
  const showCompanyDashboard = useHasPermission("dashboard.viewCompanyStats");

  return (
    <PageTransition cascade={false}>
      {showCompanyDashboard ? <AdminDashboard /> : <EmployeeDashboard />}
    </PageTransition>
  );
}
