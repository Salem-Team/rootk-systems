"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mail, Phone, Shield } from "lucide-react";
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
import { EmployeeAttendanceSummaryCards } from "@/components/employees/employee-attendance-summary";
import { EmployeeLeaveSummaryPanel } from "@/components/employees/employee-leave-summary";
import { EmployeeActivityTimeline } from "@/components/employees/employee-activity-timeline";
import { EmployeeOrgPanel } from "@/components/employees/employee-org-panel";
import {
  findDepartmentPeers,
  findDirectReports,
  findManager,
} from "@/components/employees/profile-data";
import { useEmployeeProfileExtras } from "@/hooks/use-employee-profile-extras";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { deleteEmployee } from "@/services/employees.service";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import type { Employee } from "@/types";
import type { TranslationPath } from "@/i18n";

interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  roster: Employee[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEmployee: (employee: Employee) => void;
  onEditEmployee?: (employee: Employee) => void;
  onDeleted?: (id: string) => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-end text-[13px] font-medium">{value}</span>
    </div>
  );
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

  const manager = useMemo(
    () => (employee ? findManager(employee, roster) : null),
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
      <SheetContent className="gap-0 p-0 sm:max-w-xl">
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

            <ScrollArea className="h-full">
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
                        <motion.div
                          variants={fadeInUp}
                          initial={reduceMotion ? false : "hidden"}
                          animate="visible"
                          className="space-y-6"
                        >
                          <Section title={t("employees.personalInfo")}>
                            <div className="rounded-xl border border-border bg-muted/20 px-3.5">
                              <InfoRow
                                label={t("common.email")}
                                value={employee.email}
                              />
                              <InfoRow
                                label={t("common.phone")}
                                value={employee.phone}
                              />
                              <InfoRow
                                label={t("employees.location")}
                                value={employee.location}
                              />
                            </div>
                          </Section>

                          <Section title={t("employees.jobInfo")}>
                            <div className="rounded-xl border border-border bg-muted/20 px-3.5">
                              <InfoRow
                                label={t("common.position")}
                                value={employee.position}
                              />
                              <InfoRow
                                label={t("common.department")}
                                value={t(
                                  `departments.${employee.department}` as TranslationPath
                                )}
                              />
                              <InfoRow
                                label={t("employees.manager")}
                                value={
                                  employee.manager ?? t("employees.noManager")
                                }
                              />
                              <InfoRow
                                label={t("employees.employmentType")}
                                value={t(
                                  `employees.employment.${extras.employmentType}`
                                )}
                              />
                              <InfoRow
                                label={t("employees.workLocation")}
                                value={employee.location}
                              />
                              <InfoRow
                                label={t("employees.workingMode")}
                                value={t(
                                  `employees.workMode.${extras.workMode}`
                                )}
                              />
                              <InfoRow
                                label={t("employees.hireDate")}
                                value={employee.joinDate}
                              />
                            </div>
                          </Section>

                          <Section title={t("employees.attendanceSummary")}>
                            <EmployeeAttendanceSummaryCards
                              summary={extras.attendance}
                            />
                          </Section>

                          <Section title={t("employees.leaveSummary")}>
                            <EmployeeLeaveSummaryPanel summary={extras.leave} />
                          </Section>

                          <Section title={t("employees.performanceOverview")}>
                            <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
                              <div className="flex items-end justify-between gap-3">
                                <div>
                                  <p className="section-label">
                                    {extras.performance.period}
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                                    {extras.performance.score.toFixed(1)}
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {" "}
                                      / 5
                                    </span>
                                  </p>
                                </div>
                                <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium">
                                  {t(
                                    extras.performance
                                      .labelKey as TranslationPath
                                  )}
                                </span>
                              </div>
                              <p className="mt-3 text-xs text-muted-foreground">
                                {t("employees.performanceHint")}
                              </p>
                            </div>
                          </Section>

                          <Section title={t("employees.contactInfo")}>
                            <div className="space-y-2">
                              <a
                                href={`mailto:${employee.email}`}
                                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] transition-colors hover:bg-muted/40"
                              >
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{employee.email}</span>
                              </a>
                              <a
                                href={`tel:${employee.phone.replace(/\s/g, "")}`}
                                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] transition-colors hover:bg-muted/40"
                              >
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.phone}</span>
                              </a>
                            </div>
                          </Section>

                          <Section title={t("employees.emergencyContact")}>
                            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                                <Shield className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold">
                                  {extras.emergencyContact.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t(
                                    `employees.relation.${extras.emergencyContact.relation}` as TranslationPath
                                  )}
                                </p>
                                <p className="mt-1 font-mono text-xs">
                                  {extras.emergencyContact.phone}
                                </p>
                              </div>
                            </div>
                          </Section>
                        </motion.div>
                      </TabsContent>

                      <TabsContent value="organization" className="mt-5">
                        <EmployeeOrgPanel
                          manager={manager}
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
