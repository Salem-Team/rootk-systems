import { motion, useReducedMotion } from "framer-motion";
import { Mail, Phone, Shield } from "lucide-react";
import { EmployeeAttendanceSummaryCards } from "@/components/employees/employee-attendance-summary";
import { EmployeeLeaveSummaryPanel } from "@/components/employees/employee-leave-summary";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { Employee } from "@/types";
import type { EmployeeProfileExtras } from "@/types/employee-profile";
import type { TranslationPath } from "@/i18n";
import { InfoRow, Section } from "./employee-profile-info-row";

export function EmployeeProfileOverviewTab({
  employee,
  extras,
}: {
  employee: Employee;
  extras: EmployeeProfileExtras;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-6"
    >
      <Section title={t("employees.personalInfo")}>
        <div className="rounded-xl border border-border bg-muted/20 px-3.5">
          <InfoRow label={t("common.email")} value={employee.email} />
          <InfoRow label={t("common.phone")} value={employee.phone} />
          <InfoRow
            label={t("employees.location")}
            value={employee.location}
          />
        </div>
      </Section>

      <Section title={t("employees.jobInfo")}>
        <div className="rounded-xl border border-border bg-muted/20 px-3.5">
          <InfoRow label={t("common.position")} value={employee.position} />
          <InfoRow
            label={t("common.department")}
            value={t(`departments.${employee.department}` as TranslationPath)}
          />
          <InfoRow
            label={t("employees.manager")}
            value={employee.manager ?? t("employees.noManager")}
          />
          <InfoRow
            label={t("employees.employmentType")}
            value={t(`employees.employment.${extras.employmentType}`)}
          />
          <InfoRow
            label={t("employees.workLocation")}
            value={employee.location}
          />
          <InfoRow
            label={t("employees.workingMode")}
            value={t(`employees.workMode.${extras.workMode}`)}
          />
          <InfoRow
            label={t("employees.hireDate")}
            value={employee.joinDate}
          />
        </div>
      </Section>

      <Section title={t("employees.attendanceSummary")}>
        <EmployeeAttendanceSummaryCards summary={extras.attendance} />
      </Section>

      <Section title={t("employees.leaveSummary")}>
        <EmployeeLeaveSummaryPanel summary={extras.leave} />
      </Section>

      <Section title={t("employees.performanceOverview")}>
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="section-label">{extras.performance.period}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {extras.performance.score.toFixed(1)}
                <span className="text-sm font-medium text-muted-foreground">
                  {" "}
                  / 5
                </span>
              </p>
            </div>
            <span className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium">
              {t(extras.performance.labelKey as TranslationPath)}
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
  );
}
