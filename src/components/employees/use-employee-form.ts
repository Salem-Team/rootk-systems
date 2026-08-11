import { useEffect, useMemo, useState } from "react";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "@/services/employees.service";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { getInitials } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import type { Employee } from "@/types";
import {
  LOCATIONS,
  emptyValues,
  employeeFormSchema,
  fromEmployee,
  suggestEmployeeCode,
  type EmployeeFormValues,
} from "@/components/employees/employee-form.schema";

export function useEmployeeForm({
  open,
  employee,
  roster,
  onSaved,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  employee?: Employee | null;
  roster: Employee[];
  onSaved: (employee: Employee) => void;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const sessionUser = useSessionStore((s) => s.user);
  const editing = Boolean(employee);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const sessionEmployeeId = getWorkEmployeeIdFromUser(sessionUser);
  const isSelf =
    Boolean(employee) &&
    (employee!.id === sessionEmployeeId ||
      employee!.email.trim().toLowerCase() ===
        (sessionUser.email ?? "").trim().toLowerCase());
  const canDelete =
    Boolean(onDeleted) &&
    editing &&
    !isSelf &&
    !isProtectedAdminAccount({
      employeeId: employee?.id,
      email: employee?.email,
    });

  const usedCodes = useMemo(() => {
    return new Set(
      roster
        .filter((e) => e.id !== employee?.id)
        .map((e) => e.employeeId.toLowerCase())
    );
  }, [roster, employee?.id]);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: emptyValues(),
    mode: "onBlur",
  });

  const values = form.watch();

  const managerOptions = useMemo(() => {
    const currentManager = values.manager?.trim();
    const options = roster
      .filter((e) => e.id !== employee?.id)
      .filter(
        (e) =>
          e.status === "active" ||
          (currentManager ? e.name === currentManager : false)
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    // Keep free-text managers that are not in the roster (legacy seed).
    if (currentManager && !options.some((e) => e.name === currentManager)) {
      return [
        {
          id: `legacy-manager-${currentManager}`,
          name: currentManager,
        } as Pick<Employee, "id" | "name">,
        ...options,
      ];
    }
    return options;
  }, [roster, employee?.id, values.manager]);

  const locationOptions = useMemo(() => {
    const current = values.location?.trim();
    if (current && !LOCATIONS.includes(current as (typeof LOCATIONS)[number])) {
      return [current, ...LOCATIONS];
    }
    return [...LOCATIONS];
  }, [values.location]);

  useEffect(() => {
    if (!open) setConfirmDeleteOpen(false);
  }, [open]);

  useHydrateOnOpen(open, employee?.id ?? "create", () => {
    if (employee) {
      form.reset(fromEmployee(employee));
      return;
    }
    form.reset({
      ...emptyValues(),
      employeeId: suggestEmployeeCode(usedCodes),
    });
  });

  const previewName = values.name?.trim() || t("employees.previewName");
  const previewInitials = useMemo(
    () => getInitials(values.name?.trim() || "RK"),
    [values.name]
  );

  const completion = useMemo(() => {
    const checks = [
      Boolean(values.name?.trim()),
      Boolean(values.email?.trim()),
      Boolean(values.position?.trim()),
      Boolean(values.department),
      Boolean(values.location?.trim()),
      Boolean(values.joinDate),
      Boolean(values.employeeId?.trim()),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [values]);

  function fieldMessage(code?: string) {
    if (code === "name") return t("employees.fieldNameRequired");
    if (code === "email") return t("employees.fieldEmailInvalid");
    if (code === "position") return t("employees.fieldPositionRequired");
    if (code === "password_short") return t("employees.fieldPasswordShort");
    if (code === "password_mismatch")
      return t("employees.fieldPasswordMismatch");
    if (code === "password_required")
      return t("employees.fieldPasswordRequired");
    return undefined;
  }

  function regenerateCode() {
    form.setValue("employeeId", suggestEmployeeCode(usedCodes), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(data: EmployeeFormValues) {
    const email = data.email.trim().toLowerCase();
    const duplicate = roster.some(
      (e) => e.id !== employee?.id && e.email.toLowerCase() === email
    );
    if (duplicate) {
      form.setError("email", { message: "email" });
      toast.error(t("employees.emailTaken"));
      return;
    }

    if (data.employeeId?.trim()) {
      const codeDup = roster.some(
        (e) =>
          e.id !== employee?.id &&
          e.employeeId.toLowerCase() === data.employeeId!.trim().toLowerCase()
      );
      if (codeDup) {
        toast.error(t("employees.codeTaken"));
        return;
      }
    }

    const password = data.password?.trim() ?? "";
    if (!editing && password.length < 6) {
      form.setError("password", { message: "password_required" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || undefined,
        department: data.department,
        position: data.position.trim(),
        location: data.location.trim() || undefined,
        joinDate: data.joinDate,
        status: data.status,
        manager: data.manager?.trim() || undefined,
        employeeId: data.employeeId?.trim() || undefined,
        ...(password ? { password } : {}),
      };

      const res =
        editing && employee
          ? await updateEmployee(employee.id, payload)
          : await createEmployee({
              ...payload,
              password,
            });

      if (!res.success) {
        toast.error(res.message ?? t("common.error"));
        return;
      }
      toast.success(editing ? t("employees.updated") : t("employees.created"));
      onSaved(res.data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

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

  return {
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
  };
}

export type EmployeeFormValuesType = EmployeeFormValues;
export type UseEmployeeFormReturn = ReturnType<typeof useEmployeeForm>;
