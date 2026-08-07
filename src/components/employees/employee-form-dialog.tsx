"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  Building2,
  CalendarDays,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "@/services/employees.service";
import {
  departmentSchema,
  employeeStatusSchema,
} from "@/schemas/employee.schema";
import { demoTodayKey } from "@/lib/mock-date";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { softSpring } from "@/lib/animations";
import { getInitials } from "@/lib/utils";
import { useDepartments } from "@/hooks/use-departments";
import { useTranslation } from "@/hooks/use-translation";
import { departmentLabel } from "@/lib/department-label";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import type { Employee, EmployeeStatus } from "@/types";

const LOCATIONS = [
  "Cairo",
  "New Cairo",
  "Giza",
  "Alexandria",
  "Mansoura",
  "Remote",
] as const;
const NONE_MANAGER = "__none__";

const employeeFormSchema = z
  .object({
    name: z.string().trim().min(2, "name"),
    email: z.string().trim().email("email"),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    department: departmentSchema,
    position: z.string().trim().min(2, "position"),
    location: z.string().trim().min(1).max(120),
    joinDate: z.string().min(4),
    status: employeeStatusSchema,
    manager: z.string().trim().max(120).optional().or(z.literal("")),
    employeeId: z.string().trim().max(40).optional().or(z.literal("")),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const password = data.password?.trim() ?? "";
    const confirm = data.confirmPassword?.trim() ?? "";
    if (password.length > 0 && password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password_short",
        path: ["password"],
      });
    }
    if (password !== confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password_mismatch",
        path: ["confirmPassword"],
      });
    }
  });

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

function emptyValues(): EmployeeFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    department: "Engineering",
    position: "",
    location: "Cairo",
    joinDate: demoTodayKey(),
    status: "active",
    manager: "",
    employeeId: "",
    password: "",
    confirmPassword: "",
  };
}

function fromEmployee(employee: Employee): EmployeeFormValues {
  return {
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    department: employee.department,
    position: employee.position,
    location: employee.location,
    joinDate: employee.joinDate,
    status: employee.status,
    manager: employee.manager ?? "",
    employeeId: employee.employeeId,
    password: "",
    confirmPassword: "",
  };
}

function suggestEmployeeCode(used: Set<string>) {
  for (let i = 0; i < 40; i += 1) {
    const code = `RK-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!used.has(code.toLowerCase())) return code;
  }
  return `RK-${Date.now().toString().slice(-4)}`;
}

function FormSection({
  step,
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
}: {
  step: number;
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softSpring, delay }}
      className="rounded-2xl border border-border/70 bg-gradient-to-b from-muted/25 via-card to-card p-4"
    >
      <div className="mb-3.5 flex items-start gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
          <Icon className="h-3.5 w-3.5" />
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {step}
          </span>
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </motion.section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive">{message}</p>;
}

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
  const { t } = useTranslation();
  const { activeNames } = useDepartments();
  const reduceMotion = useReducedMotion();
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
    const set = new Set(
      roster
        .filter((e) => e.id !== employee?.id)
        .map((e) => e.employeeId.toLowerCase())
    );
    return set;
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
    if (
      currentManager &&
      !options.some((e) => e.name === currentManager)
    ) {
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
    if (!open) {
      setConfirmDeleteOpen(false);
      return;
    }
    if (employee) {
      form.reset(fromEmployee(employee));
    } else {
      form.reset({
        ...emptyValues(),
        employeeId: suggestEmployeeCode(usedCodes),
      });
    }
  }, [open, employee, form, usedCodes]);

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
    if (code === "password_required") return t("employees.fieldPasswordRequired");
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
      (e) =>
        e.id !== employee?.id && e.email.toLowerCase() === email
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
          <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
            <FormSection
              step={1}
              icon={IdCard}
              title={t("employees.sectionIdentity")}
              description={t("employees.sectionIdentityDesc")}
              delay={0.02}
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="emp-name">{t("common.name")}</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="emp-name"
                    className="ps-9"
                    autoFocus={!editing}
                    placeholder={t("employees.namePlaceholder")}
                    {...form.register("name")}
                  />
                </div>
                <FieldError
                  message={fieldMessage(form.formState.errors.name?.message)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="emp-email">{t("common.email")}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="emp-email"
                    type="email"
                    className="ps-9"
                    placeholder="name@rootk.systems"
                    {...form.register("email")}
                  />
                </div>
                <FieldError
                  message={
                    form.formState.errors.email
                      ? t("employees.fieldEmailInvalid")
                      : undefined
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emp-phone">{t("common.phone")}</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="emp-phone"
                    className="ps-9"
                    placeholder="+20 1x xxx xxxx"
                    {...form.register("phone")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emp-code">{t("employees.employeeId")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="emp-code"
                    className="font-mono"
                    placeholder="RK-1xxx"
                    disabled={editing}
                    {...form.register("employeeId")}
                  />
                  {!editing ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={regenerateCode}
                      aria-label={t("employees.regenerateCode")}
                      title={t("employees.regenerateCode")}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection
              step={2}
              icon={Building2}
              title={t("employees.sectionOrg")}
              description={t("employees.sectionOrgDesc")}
              delay={0.06}
            >
              <div className="space-y-1.5">
                <Label>{t("common.department")}</Label>
                <Controller
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeNames.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emp-position">{t("common.position")}</Label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="emp-position"
                    className="ps-9"
                    placeholder={t("employees.positionPlaceholder")}
                    {...form.register("position")}
                  />
                </div>
                <FieldError
                  message={fieldMessage(
                    form.formState.errors.position?.message
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("employees.location")}</Label>
                <Controller
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            <span className="inline-flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {loc}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("employees.manager")}</Label>
                <Controller
                  control={form.control}
                  name="manager"
                  render={({ field }) => (
                    <Select
                      value={field.value || NONE_MANAGER}
                      onValueChange={(v) =>
                        field.onChange(v === NONE_MANAGER ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("employees.managerPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_MANAGER}>
                          {t("employees.noManager")}
                        </SelectItem>
                        {managerOptions.map((m) => (
                          <SelectItem key={m.id} value={m.name}>
                            <span className="inline-flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {m.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </FormSection>

            <FormSection
              step={3}
              icon={CalendarDays}
              title={t("employees.sectionEmployment")}
              description={t("employees.sectionEmploymentDesc")}
              delay={0.1}
            >
              <div className="space-y-1.5">
                <Label htmlFor="emp-join">{t("employees.hireDate")}</Label>
                <Input
                  id="emp-join"
                  type="date"
                  {...form.register("joinDate")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("common.status")}</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange(v as EmployeeStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          {t("status.active")}
                        </SelectItem>
                        <SelectItem value="on_leave">
                          {t("status.on_leave")}
                        </SelectItem>
                        <SelectItem value="inactive">
                          {t("status.inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </FormSection>

            <FormSection
              step={4}
              icon={KeyRound}
              title={t("employees.sectionAccess")}
              description={
                editing
                  ? t("employees.sectionAccessEditDesc")
                  : t("employees.sectionAccessDesc")
              }
              delay={0.14}
            >
              <div className="space-y-1.5">
                <Label htmlFor="emp-password">
                  {editing
                    ? t("employees.resetPassword")
                    : t("employees.accountPassword")}
                </Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="emp-password"
                    type="password"
                    autoComplete="new-password"
                    className="ps-9"
                    placeholder={
                      editing
                        ? t("employees.resetPasswordPlaceholder")
                        : t("employees.passwordPlaceholder")
                    }
                    {...form.register("password")}
                  />
                </div>
                <FieldError
                  message={fieldMessage(
                    form.formState.errors.password?.message
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emp-confirm-password">
                  {t("employees.confirmPassword")}
                </Label>
                <Input
                  id="emp-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("employees.confirmPasswordPlaceholder")}
                  {...form.register("confirmPassword")}
                />
                <FieldError
                  message={fieldMessage(
                    form.formState.errors.confirmPassword?.message
                  )}
                />
              </div>
            </FormSection>
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
