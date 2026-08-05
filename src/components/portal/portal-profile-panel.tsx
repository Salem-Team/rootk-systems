"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Mail, MapPin, Phone, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DepartmentBadge } from "@/components/employees/department-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import type { EmployeeProfileExtras } from "@/types/employee-profile";
import { buildPortalDocuments } from "@/components/portal/portal-mock-data";
import { useEmployeeProfileExtras } from "@/hooks/use-employee-profile-extras";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getInitials } from "@/lib/utils";
import type { Employee } from "@/types";
import type { TranslationPath } from "@/i18n";

export function PortalProfilePanel({ employee }: { employee: Employee }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const extras = useEmployeeProfileExtras(employee);
  const docs = buildPortalDocuments().slice(0, 3);

  if (!extras) return null;

  return (
    <div className="space-y-5">
      <motion.section
        variants={fadeInUp}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="surface-panel overflow-hidden"
      >
        <div className="relative border-b border-border/70 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-24 w-24 border border-border shadow-sm ring-4 ring-background">
              {employee.avatar ? (
                <AvatarImage src={employee.avatar} alt={employee.name} />
              ) : null}
              <AvatarFallback className="bg-primary/[0.1] text-2xl font-semibold text-primary">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-mono text-[11px] text-muted-foreground">
                {employee.employeeId}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                {employee.name}
              </h2>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
              <div className="flex flex-wrap gap-1.5">
                <DepartmentBadge department={employee.department} />
                <StatusBadge status={employee.status} />
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {t(`employees.employment.${extras.employmentType}`)}
                </span>
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {t(`employees.workMode.${extras.workMode}`)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoBlock title={t("portal.contactInfo")}>
            <Row icon={Mail} label={employee.email} />
            <Row icon={Phone} label={employee.phone} />
            <Row icon={MapPin} label={employee.location} />
          </InfoBlock>
          <InfoBlock title={t("portal.employmentInfo")}>
            <Meta label={t("common.department")} value={t(`departments.${employee.department}`)} />
            <Meta label={t("common.position")} value={employee.position} />
            <Meta label={t("employees.hiredOn", { date: employee.joinDate })} value="" />
            <Meta
              label={t("employees.manager")}
              value={employee.manager ?? "—"}
            />
          </InfoBlock>
          <InfoBlock title={t("portal.emergencyContact")}>
            <Meta label={t("common.name")} value={extras.emergencyContact.name} />
            <Meta
              label={t("employees.relationLabel")}
              value={t(
                `employees.relation.${extras.emergencyContact.relation}` as TranslationPath
              )}
            />
            <Row icon={Phone} label={extras.emergencyContact.phone} />
            <Row icon={Shield} label={t("portal.emergencyHint")} />
          </InfoBlock>
        </div>
      </motion.section>

      <motion.section
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="space-y-3"
      >
        <h3 className="text-sm font-semibold">{t("portal.mockDocuments")}</h3>
        <ul className="grid gap-3 sm:grid-cols-3">
          {docs.map((doc) => (
            <motion.li
              key={doc.id}
              variants={fadeInUp}
              className="surface-panel surface-panel-interactive p-4"
            >
              <p className="text-sm font-semibold">{t(doc.titleKey)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(doc.categoryKey)} · {doc.size}
              </p>
            </motion.li>
          ))}
        </ul>
      </motion.section>

      <PerformanceStrip extras={extras} />
    </div>
  );
}

function PerformanceStrip({ extras }: { extras: EmployeeProfileExtras }) {
  const { t } = useTranslation();
  return (
    <section className="surface-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="section-label !mb-0">{t("employees.performanceOverview")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(extras.performance.labelKey as TranslationPath)} ·{" "}
            {extras.performance.period}
          </p>
        </div>
        <p className="stat-value text-xl tabular-nums">
          {extras.performance.score.toFixed(1)}
        </p>
      </div>
      <Progress value={extras.performance.score * 20} className="mt-3 h-1.5" />
    </section>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
      <p className="section-label">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
}: {
  icon: typeof Mail;
  label: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </p>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) {
    return <p className="text-sm text-muted-foreground">{label}</p>;
  }
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
