"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Clock3, Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSettings } from "@/services/settings.service";
import { getWorkSchedule } from "@/services/schedule.service";
import { useTranslation } from "@/hooks/use-translation";
import { normalizeCompanyNotifications } from "@/lib/notification-policy";
import type { CompanySettings, WorkSchedule } from "@/types";

/** Read-only company policy mirror for employees — reflects admin changes. */
export function CompanyPolicySection() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, sch] = await Promise.all([getSettings(), getWorkSchedule()]);
    if (s.success) setSettings(s.data);
    if (sch.success) setSchedule(sch.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  const rows = [
    { label: t("settings.companyName"), value: settings.name },
    { label: t("settings.currency"), value: settings.currency },
    { label: t("settings.timezone"), value: settings.timezone },
    {
      label: t("settings.companyDefaultLanguage"),
      value: settings.language === "ar" ? t("common.arabic") : t("common.english"),
    },
    {
      label: t("settings.companyDefaultTheme"),
      value:
        settings.appearance === "light"
          ? t("common.light")
          : settings.appearance === "dark"
            ? t("common.dark")
            : t("common.system"),
    },
    {
      label: t("admin.workingHours"),
      value: schedule ? `${schedule.fromTime} – ${schedule.toTime}` : "—",
    },
    {
      label: t("admin.gracePeriod"),
      value: schedule
        ? `${schedule.gracePeriodMinutes} ${t("attendance.minutes")}`
        : "—",
    },
  ];

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Shield className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("settings.companyPolicy")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("settings.companyPolicyDesc")}
          </p>
        </div>
        <Badge variant="outline">{t("settings.readOnlyPolicy")}</Badge>
      </div>
      <div className="panel-body space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3"
            >
              <p className="section-label">{row.label}</p>
              <p className="mt-1 text-sm font-semibold">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-3.5 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {t("settings.companyNotificationsPolicy")}
          </p>
          <ul className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {(
              [
                ["inApp", t("admin.notifInApp")],
                ["email", t("settings.emailNotif")],
                ["push", t("settings.pushNotif")],
                ["sound", t("settings.soundNotif")],
                ["attendanceReminders", t("settings.attendanceReminders")],
                ["leaveUpdates", t("settings.leaveUpdates")],
                ["schedule", t("admin.notifSchedule")],
                ["work", t("admin.notifWork")],
                ["payroll", t("admin.notifPayroll")],
                ["announcements", t("admin.notifAnnouncements")],
                ["mention", t("admin.notifMention")],
                ["system", t("admin.notifSystem")],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <span className="font-semibold text-foreground">
                  {normalizeCompanyNotifications(settings.notifications)[key]
                    ? t("common.enabled")
                    : t("common.disabled")}
                </span>
              </li>
            ))}
          </ul>
          {normalizeCompanyNotifications(settings.notifications)
            .quietHoursEnabled ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("admin.notifQuietTitle")}:{" "}
              {
                normalizeCompanyNotifications(settings.notifications)
                  .quietHoursStart
              }{" "}
              –{" "}
              {
                normalizeCompanyNotifications(settings.notifications)
                  .quietHoursEnd
              }
            </p>
          ) : null}
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {t("settings.companyPolicyUpdated")}:{" "}
          {settings.updatedAt.slice(0, 16).replace("T", " ")}
        </p>
      </div>
    </section>
  );
}
