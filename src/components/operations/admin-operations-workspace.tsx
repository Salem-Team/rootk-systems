"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdminOpsPanel,
  HrOpsPanel,
  ManagerOpsPanel,
} from "@/components/operations/role-ops-panels";
import { AdminWorkPulseWidget } from "@/components/operations/admin-work-pulse-widget";
import { FloatingQuickActions } from "@/components/operations/floating-quick-actions";
import { ActivityCenterWidget } from "@/components/operations/feed-ops-panels";
import { useTranslation } from "@/hooks/use-translation";
import type {
  Activity,
  AttendanceRecord,
  DashboardStats,
  Employee,
  LeaveRequest,
} from "@/types";

export function AdminOperationsWorkspace({
  stats,
  employees,
  attendance,
  leaves,
  activities,
}: {
  stats: DashboardStats;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  activities: Activity[];
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("operations");

  return (
    <section className="space-y-4" aria-label={t("ops.adminWorkspace")}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          {t("ops.adminWorkspace")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("ops.adminWorkspaceDesc")}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="operations">{t("ops.tabOperations")}</TabsTrigger>
          <TabsTrigger value="work">{t("ops.tabWork")}</TabsTrigger>
          <TabsTrigger value="manager">{t("ops.tabManager")}</TabsTrigger>
          <TabsTrigger value="hr">{t("ops.tabHr")}</TabsTrigger>
          <TabsTrigger value="activity">{t("ops.tabActivity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-4 space-y-4">
          <AdminOpsPanel stats={stats} activitiesCount={activities.length} />
        </TabsContent>
        <TabsContent value="work" className="mt-4">
          <AdminWorkPulseWidget />
        </TabsContent>
        <TabsContent value="manager" className="mt-4">
          <ManagerOpsPanel
            employees={employees}
            attendance={attendance}
            leaves={leaves}
          />
        </TabsContent>
        <TabsContent value="hr" className="mt-4">
          <HrOpsPanel employees={employees} leaves={leaves} stats={stats} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityCenterWidget />
        </TabsContent>
      </Tabs>

      <FloatingQuickActions variant="admin" />
    </section>
  );
}
