"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeProfileHeader } from "@/components/employees/employee-profile-header";
import { EmployeeDeleteConfirmDialog } from "@/components/employees/employee-delete-confirm";
import { EmployeeActivityTimeline } from "@/components/employees/employee-activity-timeline";
import { EmployeeOrgPanel } from "@/components/employees/employee-org-panel";
import { EmployeeProfileOverviewTab } from "@/components/employees/employee-profile-overview-tab";
import {
  findDepartmentPeers,
  findDirectReports,
  findManagers,
} from "@/components/employees/profile-data";
import { useEmployeeProfileExtras } from "@/hooks/use-employee-profile-extras";
import { useTranslation } from "@/hooks/use-translation";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { deleteEmployee } from "@/services/employees.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import type { Employee } from "@/types";

interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  roster: Employee[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEmployee: (employee: Employee) => void;
  onEditEmployee?: (employee: Employee) => void;
  onDeleted?: (id: string) => void;
}

export function EmployeeProfileDrawer({
  employee,
  roster,
  open,
  onOpenChange,
  onSelectEmployee,
  onEditEmployee,
  onDeleted,
}: EmployeeProfileDrawerProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const sessionUser = useSessionStore((s) => s.user);
  const [tab, setTab] = useState("overview");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const extras = useEmployeeProfileExtras(employee);

  const managers = useMemo(
    () => (employee ? findManagers(employee, roster) : []),
    [employee, roster]
  );
  const directReports = useMemo(
    () => (employee ? findDirectReports(employee, roster) : []),
    [employee, roster]
  );
  const departmentPeers = useMemo(
    () => (employee ? findDepartmentPeers(employee, roster) : []),
    [employee, roster]
  );

  const sessionEmployeeId = getWorkEmployeeIdFromUser(sessionUser);
  const isSelf =
    Boolean(employee) &&
    (employee!.id === sessionEmployeeId ||
      employee!.email.trim().toLowerCase() ===
        (sessionUser.email ?? "").trim().toLowerCase());
  const canDelete =
    Boolean(onDeleted) &&
    Boolean(employee) &&
    !isSelf &&
    !isProtectedAdminAccount({
      employeeId: employee?.id,
      email: employee?.email,
    });

  async function handleDelete() {
    if (!employee || !onDeleted) return;
    if (
      isProtectedAdminAccount({
        employeeId: employee.id,
        email: employee.email,
      })
    ) {
      toast.error(t("employees.adminDeleteBlocked"));
      return;
    }
    if (isSelf) {
      toast.error(t("employees.selfDeleteBlocked"));
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteEmployee(employee.id);
      if (!res.success) {
        toast.error(res.message ?? t("common.error"));
        return;
      }
      toast.success(t("employees.deleted"));
      setConfirmDeleteOpen(false);
      onDeleted(employee.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setTab("overview");
          setConfirmDeleteOpen(false);
        }
      }}
    >
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {employee && extras ? (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>{employee.name}</SheetTitle>
              <SheetDescription>
                {t("employees.profileDescription", {
                  name: employee.name,
                })}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-5 pb-8 pt-5 sm:px-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={employee.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-6"
                  >
                    <EmployeeProfileHeader
                      employee={employee}
                      employmentType={extras.employmentType}
                      workMode={extras.workMode}
                      onEdit={
                        onEditEmployee
                          ? () => onEditEmployee(employee)
                          : undefined
                      }
                      onDelete={
                        canDelete
                          ? () => setConfirmDeleteOpen(true)
                          : undefined
                      }
                    />

                    <Tabs value={tab} onValueChange={setTab} className="w-full">
                      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1">
                        <TabsTrigger
                          value="overview"
                          className="rounded-lg text-xs data-[state=active]:shadow-sm"
                        >
                          {t("employees.tabOverview")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="organization"
                          className="rounded-lg text-xs data-[state=active]:shadow-sm"
                        >
                          {t("employees.tabOrganization")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="activity"
                          className="rounded-lg text-xs data-[state=active]:shadow-sm"
                        >
                          {t("employees.tabActivity")}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="mt-5 space-y-6">
                        <EmployeeProfileOverviewTab
                          employee={employee}
                          extras={extras}
                        />
                      </TabsContent>

                      <TabsContent value="organization" className="mt-5">
                        <EmployeeOrgPanel
                          managers={managers}
                          directReports={directReports}
                          departmentPeers={departmentPeers}
                          onSelect={onSelectEmployee}
                        />
                      </TabsContent>

                      <TabsContent value="activity" className="mt-5">
                        <EmployeeActivityTimeline items={extras.activity} />
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                </AnimatePresence>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>

    {employee ? (
      <EmployeeDeleteConfirmDialog
        open={confirmDeleteOpen}
        employeeName={employee.name}
        deleting={deleting}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={() => void handleDelete()}
      />
    ) : null}
    </>
  );
}
