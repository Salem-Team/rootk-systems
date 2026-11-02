import type { ReactNode } from "react";
import Image from "next/image";
import { Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAND_PREVIEW } from "@/components/admin/admin-mock-data";
import { LOGO_SRC } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import type { CompanySettings } from "@/types";

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

export function CompanyIdentitySection({
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
    <section className="surface-panel min-w-0 max-w-full overflow-hidden">
      <div className="panel-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:h-14 sm:w-14">
            <Image
              src={LOGO_SRC}
              alt={t("app.name")}
              width={56}
              height={56}
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[0.95rem] font-semibold tracking-tight sm:text-base">
              {t("admin.companyProfile")}
            </h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground sm:text-sm">
              {t("admin.companyProfileDesc")}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-2.5 py-2 sm:px-3">
          <Palette className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-[11px] text-muted-foreground sm:text-xs">
            {t("admin.brandPreview")}
          </span>
          <span
            className="h-5 w-5 shrink-0 rounded-md border border-border shadow-sm"
            style={{ background: BRAND_PREVIEW }}
            aria-label={BRAND_PREVIEW}
          />
          <code className="min-w-0 truncate font-mono text-[11px]">{BRAND_PREVIEW}</code>
        </div>
      </div>
      <div className="panel-body grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
        <Field label={t("settings.companyName")} htmlFor="admin-name">
          <Input
            id="admin-name"
            className="min-h-11 touch-manipulation sm:min-h-9"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
          />
        </Field>
        <Field label={t("settings.legalName")} htmlFor="admin-legal">
          <Input
            id="admin-legal"
            className="min-h-11 touch-manipulation sm:min-h-9"
            value={form.legalName}
            onChange={(e) => onChange("legalName", e.target.value)}
          />
        </Field>
        <Field label={t("common.email")} htmlFor="admin-email">
          <Input
            id="admin-email"
            type="email"
            className="min-h-11 touch-manipulation sm:min-h-9"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </Field>
        <Field label={t("common.phone")} htmlFor="admin-phone">
          <Input
            id="admin-phone"
            type="tel"
            inputMode="tel"
            className="min-h-11 touch-manipulation sm:min-h-9"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </Field>
        <Field label={t("settings.website")} htmlFor="admin-web">
          <Input
            id="admin-web"
            type="url"
            className="min-h-11 touch-manipulation sm:min-h-9"
            value={form.website}
            onChange={(e) => onChange("website", e.target.value)}
          />
        </Field>
        <Field label={t("settings.timezone")} htmlFor="admin-tz">
          <Select
            value={form.timezone}
            onValueChange={(v) => onChange("timezone", v)}
          >
            <SelectTrigger id="admin-tz" className="min-h-11 touch-manipulation sm:min-h-9">
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
        <div className="min-w-0 space-y-2 sm:col-span-2">
          <Label htmlFor="admin-address">{t("settings.address")}</Label>
          <Input
            id="admin-address"
            className="min-h-11 touch-manipulation sm:min-h-9"
            value={form.address}
            onChange={(e) => onChange("address", e.target.value)}
          />
        </div>
        <Field label={t("settings.currency")} htmlFor="admin-currency">
          <Select
            value={form.currency}
            onValueChange={(v) => onChange("currency", v)}
          >
            <SelectTrigger id="admin-currency" className="min-h-11 touch-manipulation sm:min-h-9">
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
            <SelectTrigger id="admin-lang" className="min-h-11 touch-manipulation sm:min-h-9">
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
  );
}
