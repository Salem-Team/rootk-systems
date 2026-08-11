"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import {
  Briefcase,
  Building2,
  IdCard,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
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
  FieldError,
  FormSection,
} from "@/components/employees/employee-form-section";
import type { EmployeeFormValues } from "@/components/employees/employee-form.schema";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import type { Employee } from "@/types";
import type { useTranslation } from "@/hooks/use-translation";

export function EmployeeIdentityFields({
  form,
  t,
  editing,
  fieldMessage,
  regenerateCode,
}: {
  form: UseFormReturn<EmployeeFormValues>;
  t: ReturnType<typeof useTranslation>["t"];
  editing: boolean;
  fieldMessage: (code?: string) => string | undefined;
  regenerateCode: () => void;
}) {
  return (
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
  );
}

export function EmployeeOrgFields({
  form,
  t,
  activeNames,
  locationOptions,
  managerOptions,
  fieldMessage,
}: {
  form: UseFormReturn<EmployeeFormValues>;
  t: ReturnType<typeof useTranslation>["t"];
  activeNames: string[];
  locationOptions: string[];
  managerOptions: Employee[];
  fieldMessage: (code?: string) => string | undefined;
}) {
  return (
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
          message={fieldMessage(form.formState.errors.position?.message)}
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

      <Controller
        control={form.control}
        name="managerEmployeeIds"
        render={({ field }) => (
          <EmployeeMultiPicker
            employees={managerOptions}
            selectedIds={field.value}
            onChange={field.onChange}
            label={t("employees.managers")}
          />
        )}
      />
    </FormSection>
  );
}
