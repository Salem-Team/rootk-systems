"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Clock, Globe2, MapPin, Palette } from "lucide-react";
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
import { ADMIN_BRANCHES, BRAND_PREVIEW } from "@/components/admin/admin-mock-data";
import { LOGO_SRC } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { CompanySettings } from "@/types";

export function CompanyProfilePanel({
  form,
  onChange,
}: {
  form: CompanySettings;
  onChange: <K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K]
  ) => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div variants={fadeInUp} className="space-y-5">
      <section className="surface-panel overflow-hidden">
        <div className="panel-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <Image
                src={LOGO_SRC}
                alt={t("app.name")}
                width={56}
                height={56}
                className="h-full w-full object-contain p-1"
              />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                {t("admin.companyProfile")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.companyProfileDesc")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground">
              {t("admin.brandPreview")}
            </span>
            <span
              className="h-5 w-5 rounded-md border border-border shadow-sm"
              style={{ background: BRAND_PREVIEW }}
              aria-label={BRAND_PREVIEW}
            />
            <code className="font-mono text-[11px]">{BRAND_PREVIEW}</code>
          </div>
        </div>
        <div className="panel-body grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.companyName")} htmlFor="admin-name">
            <Input
              id="admin-name"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
            />
          </Field>
          <Field label={t("settings.legalName")} htmlFor="admin-legal">
            <Input
              id="admin-legal"
              value={form.legalName}
              onChange={(e) => onChange("legalName", e.target.value)}
            />
          </Field>
          <Field label={t("common.email")} htmlFor="admin-email">
            <Input
              id="admin-email"
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
            />
          </Field>
          <Field label={t("common.phone")} htmlFor="admin-phone">
            <Input
              id="admin-phone"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
            />
          </Field>
          <Field label={t("settings.website")} htmlFor="admin-web">
            <Input
              id="admin-web"
              value={form.website}
              onChange={(e) => onChange("website", e.target.value)}
            />
          </Field>
          <Field label={t("settings.timezone")} htmlFor="admin-tz">
            <Select
              value={form.timezone}
              onValueChange={(v) => onChange("timezone", v)}
            >
              <SelectTrigger id="admin-tz">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Cairo">Africa/Cairo</SelectItem>
                <SelectItem value="Africa/Khartoum">Africa/Khartoum</SelectItem>
                <SelectItem value="Asia/Riyadh">Asia/Riyadh</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="admin-address">{t("settings.address")}</Label>
            <Input
              id="admin-address"
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
            />
          </div>
          <Field label={t("settings.currency")} htmlFor="admin-currency">
            <Select
              value={form.currency}
              onValueChange={(v) => onChange("currency", v)}
            >
              <SelectTrigger id="admin-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">EGP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("admin.defaultLanguage")} htmlFor="admin-lang">
            <Select
              value={form.language}
              onValueChange={(v) =>
                onChange("language", v as CompanySettings["language"])
              }
            >
              <SelectTrigger id="admin-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("common.english")}</SelectItem>
                <SelectItem value="ar">{t("common.arabic")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.workingHours")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.workingHoursDesc")}
          </p>
        </div>
        <div className="panel-body flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-mono tabular-nums">
              09:00 – 18:00
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" aria-hidden />
              {form.timezone}
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/schedule">{t("settings.openSchedule")}</Link>
          </Button>
        </div>
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.branches")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.branchesDesc")}
          </p>
        </div>
        <ul className="panel-body grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_BRANCHES.map((branch) => (
            <li
              key={branch.id}
              className="rounded-xl border border-border/70 bg-muted/20 p-3.5 transition-colors hover:border-primary/20 hover:bg-muted/35"
            >
              <p className="text-[13px] font-semibold">{branch.name}</p>
              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {branch.address}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {branch.city} · {branch.timezone}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </motion.div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
