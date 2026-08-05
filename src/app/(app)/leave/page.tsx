"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { PageSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { LeaveForm } from "@/components/leave/leave-form";
import { LeaveCard } from "@/components/leave/leave-card";
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
import { useTranslation } from "@/hooks/use-translation";
import { staggerContainer } from "@/lib/animations";
import { computeLeaveBalance } from "@/lib/leave-balance";
import type { Employee, LeaveRequest } from "@/types";

export default function LeavePage() {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const isAdmin = role === "admin";
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    const [leaveRes, empRes] = await Promise.all([
      getLeaveRequests(isAdmin ? {} : { employeeId: workEmployeeId }),
      getEmployees(),
    ]);
    if (leaveRes.success) setRequests(leaveRes.data);
    if (empRes.success) setEmployees(empRes.data);
    setLoading(false);
  }, [isAdmin, workEmployeeId]);

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

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus />
          {t("leave.newRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
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
  );

  return (
    <PageTransition>
      <PageHeader
        className="mb-4 sm:mb-7"
        eyebrow={t("leave.eyebrow")}
        title={isAdmin ? t("leave.title") : t("leave.myRequests")}
        description={
          isAdmin ? t("leaveWorkflow.pageDesc") : t("leave.employeePageDesc")
        }
        actions={<div className="hidden sm:block">{createDialog}</div>}
      />

      <div className="mb-4 space-y-4 sm:mb-6 sm:space-y-6">
        <LeaveStatsStrip
          requests={isAdmin ? requests : mine}
          compact={!isAdmin}
        />
        <div className="sm:hidden">{createDialog}</div>
      </div>

      <Tabs
        key={role}
        defaultValue={isAdmin ? "workflow" : "mine"}
        className="space-y-6"
      >
        {isAdmin ? (
          <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto [scrollbar-width:none] sm:w-auto sm:flex-wrap [&::-webkit-scrollbar]:hidden">
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

        {isAdmin ? (
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
                    isAdmin
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
                  {requests.length === 0 ? (
                    <EmptyState
                      title={t("leave.empty")}
                      description={t("leave.emptyDesc")}
                      actionLabel={t("leave.newRequest")}
                      onAction={() => setCreateOpen(true)}
                    />
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      {requests.map((request) => (
                        <LeaveCard
                          key={request.id}
                          request={request}
                          employee={employeeMap.get(request.employeeId)}
                          showActions={request.status === "pending"}
                          onUpdated={handleUpdated}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
                <div className="xl:col-span-2">
                  <LeaveWorkflowSidebar
                    isAdmin
                    requests={requests}
                    employees={employees}
                    balance={balance}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pending">
              {pending.length === 0 ? (
                <EmptyState
                  title={t("leave.emptyPending")}
                  description={t("leave.emptyDesc")}
                />
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {pending.map((request) => (
                    <LeaveCard
                      key={request.id}
                      request={request}
                      employee={employeeMap.get(request.employeeId)}
                      showActions
                      onUpdated={handleUpdated}
                    />
                  ))}
                </motion.div>
              )}
            </TabsContent>
          </>
        ) : null}

        <TabsContent value="mine" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="space-y-4 xl:col-span-3">
              {mine.length === 0 ? (
                <EmptyState
                  title={t("leave.empty")}
                  description={t("leave.emptyDesc")}
                  actionLabel={t("leave.newRequest")}
                  onAction={() => setCreateOpen(true)}
                />
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-3 sm:grid-cols-2 sm:gap-4"
                >
                  {mine.map((request) => (
                    <LeaveCard
                      key={request.id}
                      request={request}
                      employee={employeeMap.get(request.employeeId)}
                      onUpdated={handleUpdated}
                    />
                  ))}
                </motion.div>
              )}
            </div>
            <div className="xl:col-span-2">
              <LeaveWorkflowSidebar
                isAdmin={false}
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
