"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmployeeDeleteConfirmDialog } from "@/components/employees/employee-delete-confirm";
import {
  EmployeeIdentityFields,
  EmployeeOrgFields,
} from "@/components/employees/employee-identity-org-fields";
import {
  EmployeeAccessFields,
  EmployeeEmploymentFields,
} from "@/components/employees/employee-employment-access-fields";
import { useEmployeeForm } from "@/components/employees/use-employee-form";
import { useDepartments } from "@/hooks/use-departments";
import { departmentLabel } from "@/lib/department-label";
import type { Employee } from "@/types";

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  roster = [],
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  roster?: Employee[];
  onSaved: (employee: Employee) => void;
  onDeleted?: (id: string) => void;
}) {
  const { activeNames } = useDepartments();
  const reduceMotion = useReducedMotion();
  const {
    t,
    editing,
    saving,
    deleting,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    isSelf,
    canDelete,
    form,
    values,
    managerOptions,
    locationOptions,
    previewName,
    previewInitials,
    completion,
    fieldMessage,
    regenerateCode,
    onSubmit,
    handleDelete,
  } = useEmployeeForm({ open, employee, roster, onSaved, onOpenChange, onDeleted });

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) setConfirmDeleteOpen(false);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border/60 bg-[radial-gradient(ellipse_at_top,_rgba(8,40,104,0.08),_transparent_55%)] px-5 pb-4 pt-5 pe-12 text-start">
            <div className="flex items-center gap-2 text-primary">
              <UserPlus className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                {editing
                  ? t("employees.editEyebrow")
                  : t("employees.createEyebrow")}
              </span>
            </div>
            <SheetTitle className="text-xl tracking-tight">
              {editing ? t("employees.editTitle") : t("employees.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing ? t("employees.editDesc") : t("employees.createDesc")}
            </SheetDescription>
            {!editing ? (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{t("employees.profileCompleteness")}</span>
                  <span className="font-semibold text-foreground">
                    {completion}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: `${completion}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.35 }}
                  />
                </div>
              </div>
            ) : null}
          </SheetHeader>

          <div className="border-b border-border/55 bg-card px-5 py-3.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${previewName}-${values.department}-${values.status}`}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                className="flex items-center gap-3"
              >
                <Avatar className="h-12 w-12 border border-border shadow-sm">
                  <AvatarFallback className="bg-primary/[0.09] text-sm font-bold text-primary">
                    {previewInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold tracking-tight">
                    {previewName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {values.position?.trim() || t("employees.previewRole")}
                    {" · "}
                    {departmentLabel(values.department, t)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={values.status} />
                    {values.employeeId ? (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {values.employeeId}
                      </Badge>
                    ) : null}
                    {values.location ? (
                      <Badge variant="outline" className="text-[10px]">
                        {values.location}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 py-4">
              <EmployeeIdentityFields
                form={form}
                t={t}
                editing={editing}
                fieldMessage={fieldMessage}
                regenerateCode={regenerateCode}
              />

              <EmployeeOrgFields
                form={form}
                t={t}
                activeNames={activeNames}
                locationOptions={locationOptions}
                managerOptions={managerOptions}
                fieldMessage={fieldMessage}
              />

              <EmployeeEmploymentFields form={form} t={t} />

              <EmployeeAccessFields
                form={form}
                t={t}
                editing={editing}
                fieldMessage={fieldMessage}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-border/60 bg-card/95 px-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              {canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || deleting}
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("employees.actionDelete")}
                </Button>
              ) : (
                <p className="max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">
                  {editing && onDeleted && isSelf
                    ? t("employees.selfDeleteBlocked")
                    : editing && onDeleted
                      ? t("employees.adminDeleteBlocked")
                      : t("employees.formSecureNote")}
                </p>
              )}
              <div className="flex gap-2 sm:ms-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || deleting}
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={saving || deleting}
                  className="min-w-[9.5rem] shadow-[0_8px_18px_rgba(8,40,104,0.16)]"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {editing ? t("common.save") : t("employees.createCta")}
                </Button>
              </div>
            </div>
          </form>
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
