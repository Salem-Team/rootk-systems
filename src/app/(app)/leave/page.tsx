"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { LeaveForm } from "@/components/leave/leave-form";
import { LeaveRequestGrid } from "@/components/leave/leave-request-grid";
import {
  AdminLeaveReviewPanel,
  DepartmentLeaveCalendar,
  LeaveCoverageOverview,
  LeaveStatsStrip,
  LeaveWorkflowSidebar,
} from "@/components/leave/leave-workflow-panels";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getEmployees } from "@/services/employees.service";
import { getLeaveRequests } from "@/services/leave.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import { useHasAnyPermission, useHasPermission } from "@/hooks/use-permission";
import { useTranslation } from "@/hooks/use-translation";
import { computeLeaveBalance } from "@/lib/leave-balance";
import type { Employee, LeaveRequest } from "@/types";

export default function LeavePage() {
  const { t } = useTranslation();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const canManageLeave = useHasAnyPermission([
    "leave.viewAll",
    "leave.viewTeam",
    "leave.approve",
    "leave.reject",
    "leave.approveTeam",
    "leave.rejectTeam",
  ]);
  const canRequestLeave = useHasPermission("leave.request");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    const [leaveRes, empRes] = await Promise.all([
      getLeaveRequests(canManageLeave ? {} : { employeeId: workEmployeeId }),
      getEmployees(),
    ]);
    if (leaveRes.success) setRequests(leaveRes.data);
    if (empRes.success) setEmployees(empRes.data);
    setLoading(false);
  }, [canManageLeave, workEmployeeId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees]
  );

  const pending = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests]
  );

  const mine = useMemo(
    () => requests.filter((r) => r.employeeId === workEmployeeId),
    [requests, workEmployeeId]
  );

  const balance = useMemo(() => computeLeaveBalance(mine), [mine]);

  function handleUpdated(updated: LeaveRequest) {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  }

  function handleCreated(created: LeaveRequest) {
    setRequests((prev) => [created, ...prev]);
    setCreateOpen(false);
  }

  if (loading) {
    return <PageSkeleton />;
  }

  const createDialog = canRequestLeave ? (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus />
          {t("leave.newRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("leave.formTitle")}</DialogTitle>
          <DialogDescription>{t("leave.formDesc")}</DialogDescription>
        </DialogHeader>
        <LeaveForm
          onSuccess={handleCreated}
          onCancel={() => setCreateOpen(false)}
        />
      </DialogContent>
    </Dialog>
  ) : null;

  return (
    <PageTransition>
      <PageHeader
        className="mb-4 sm:mb-7"
        eyebrow={t("leave.eyebrow")}
        title={canManageLeave ? t("leave.title") : t("leave.myRequests")}
        description={
          canManageLeave
            ? t("leaveWorkflow.pageDesc")
            : t("leave.employeePageDesc")
        }
        actions={
          createDialog ? (
            <div className="hidden sm:block">{createDialog}</div>
          ) : undefined
        }
      />

      <div className="mb-4 space-y-4 sm:mb-6 sm:space-y-6">
        <LeaveStatsStrip
          requests={canManageLeave ? requests : mine}
          compact={!canManageLeave}
        />
        {createDialog ? <div className="sm:hidden">{createDialog}</div> : null}
      </div>

      <Tabs
        key={canManageLeave ? "manage" : "mine"}
        defaultValue={canManageLeave ? "workflow" : "mine"}
        className="space-y-6"
      >
        {canManageLeave ? (
          <TabsList className="scroll-x flex h-auto w-full flex-nowrap justify-start gap-1 [scrollbar-width:none] sm:w-auto sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="workflow" className="shrink-0">
              {t("leaveWorkflow.reviewTab")}
            </TabsTrigger>
            <TabsTrigger value="all" className="shrink-0">
              {t("leave.allRequests")} ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="shrink-0">
              {t("leave.pendingTab")} ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="shrink-0">
              {t("leave.myRequests")} ({mine.length})
            </TabsTrigger>
          </TabsList>
        ) : null}

        {canManageLeave ? (
          <>
            <TabsContent value="workflow" className="space-y-6">
              <AdminLeaveReviewPanel
                pending={pending}
                employees={employeeMap}
                onUpdated={handleUpdated}
              />
              <div className="grid gap-6 xl:grid-cols-5">
                <div className="xl:col-span-3">
                  <DepartmentAndCoverage />
                </div>
                <div className="xl:col-span-2">
                  <LeaveWorkflowSidebar
                    canManage
                    requests={requests}
                    employees={employees}
                    balance={balance}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-5">
                <div className="xl:col-span-3">
                  <LeaveRequestGrid
                    requests={requests}
                    employeeMap={employeeMap}
                    showActions={(request) => request.status === "pending"}
                    onUpdated={handleUpdated}
                    emptyTitle={t("leave.empty")}
                    emptyDescription={t("leave.emptyDesc")}
                    emptyActionLabel={
                      canRequestLeave ? t("leave.newRequest") : undefined
                    }
                    onEmptyAction={
                      canRequestLeave ? () => setCreateOpen(true) : undefined
                    }
                  />
                </div>
                <div className="xl:col-span-2">
                  <LeaveWorkflowSidebar
                    canManage
                    requests={requests}
                    employees={employees}
                    balance={balance}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pending">
              <LeaveRequestGrid
                requests={pending}
                employeeMap={employeeMap}
                showActions
                onUpdated={handleUpdated}
                emptyTitle={t("leave.emptyPending")}
                emptyDescription={t("leave.emptyDesc")}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              />
            </TabsContent>
          </>
        ) : null}

        <TabsContent value="mine" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="space-y-4 xl:col-span-3">
              <LeaveRequestGrid
                requests={mine}
                employeeMap={employeeMap}
                onUpdated={handleUpdated}
                emptyTitle={t("leave.empty")}
                emptyDescription={t("leave.emptyDesc")}
                emptyActionLabel={
                  canRequestLeave ? t("leave.newRequest") : undefined
                }
                onEmptyAction={
                  canRequestLeave ? () => setCreateOpen(true) : undefined
                }
                className="grid gap-3 sm:grid-cols-2 sm:gap-4"
              />
            </div>
            <div className="xl:col-span-2">
              <LeaveWorkflowSidebar
                canManage={false}
                requests={mine}
                employees={employees}
                balance={balance}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}

function DepartmentAndCoverage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DepartmentLeaveCalendar />
      <LeaveCoverageOverview />
    </div>
  );
}
