"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { CalendarDays, KeyRound } from "lucide-react";
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
  FieldError,
  FormSection,
} from "@/components/employees/employee-form-section";
import type { EmployeeFormValues } from "@/components/employees/employee-form.schema";
import type { EmployeeStatus } from "@/types";
import type { useTranslation } from "@/hooks/use-translation";

export function EmployeeEmploymentFields({
  form,
  t,
}: {
  form: UseFormReturn<EmployeeFormValues>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <FormSection
      step={3}
      icon={CalendarDays}
      title={t("employees.sectionEmployment")}
      description={t("employees.sectionEmploymentDesc")}
      delay={0.1}
    >
      <div className="space-y-1.5">
        <Label htmlFor="emp-join">{t("employees.hireDate")}</Label>
        <Input id="emp-join" type="date" {...form.register("joinDate")} />
      </div>

      <div className="space-y-1.5">
        <Label>{t("common.status")}</Label>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v as EmployeeStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("status.active")}</SelectItem>
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
  );
}

export function EmployeeAccessFields({
  form,
  t,
  editing,
  fieldMessage,
}: {
  form: UseFormReturn<EmployeeFormValues>;
  t: ReturnType<typeof useTranslation>["t"];
  editing: boolean;
  fieldMessage: (code?: string) => string | undefined;
}) {
  return (
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
          message={fieldMessage(form.formState.errors.password?.message)}
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
  );
}
