"use client";

import { motion } from "framer-motion";
import { Bell, BellRing, Mail, Smartphone, Volume2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { normalizeCompanyNotifications } from "@/lib/notification-policy";
import type { CompanyNotificationSettings } from "@/lib/notification-policy";
import type { TranslationPath } from "@/i18n";
import type { CompanySettings } from "@/types";
import { PolicyRow } from "./notification-policy-row";
import { NotificationQuietHoursSection } from "./notification-quiet-hours-section";
import { NotificationRetentionSection } from "./notification-retention-section";

type BoolPolicyKey = {
  [K in keyof CompanyNotificationSettings]: CompanyNotificationSettings[K] extends boolean
    ? K
    : never;
}[keyof CompanyNotificationSettings];

const CHANNELS: {
  key: BoolPolicyKey;
  title: TranslationPath;
  desc: TranslationPath;
  icon: typeof Bell;
}[] = [
  { key: "inApp", title: "admin.notifInApp", desc: "admin.notifInAppDesc", icon: Bell },
  { key: "email", title: "settings.emailNotif", desc: "admin.notifEmailDesc", icon: Mail },
  { key: "push", title: "settings.pushNotif", desc: "admin.notifPushDesc", icon: Smartphone },
  { key: "sound", title: "settings.soundNotif", desc: "admin.notifSoundDesc", icon: Volume2 },
];

const CATEGORIES: {
  key: BoolPolicyKey;
  title: TranslationPath;
  desc: TranslationPath;
}[] = [
  { key: "attendanceReminders", title: "settings.attendanceReminders", desc: "admin.notifAttendanceDesc" },
  { key: "leaveUpdates", title: "settings.leaveUpdates", desc: "admin.notifLeaveDesc" },
  { key: "schedule", title: "admin.notifSchedule", desc: "admin.notifScheduleDesc" },
  { key: "work", title: "admin.notifWork", desc: "admin.notifWorkDesc" },
  { key: "payroll", title: "admin.notifPayroll", desc: "admin.notifPayrollDesc" },
  { key: "announcements", title: "admin.notifAnnouncements", desc: "admin.notifAnnouncementsDesc" },
  { key: "mention", title: "admin.notifMention", desc: "admin.notifMentionDesc" },
  { key: "system", title: "admin.notifSystem", desc: "admin.notifSystemDesc" },
];

export function NotificationSettingsPanel({
  form,
  onChange,
  onPatch,
}: {
  form: CompanySettings;
  onChange: (key: BoolPolicyKey, value: boolean) => void;
  onPatch?: (patch: Partial<CompanyNotificationSettings>) => void;
}) {
  const { t } = useTranslation();
  const policy = normalizeCompanyNotifications(form.notifications);

  return (
    <div className="space-y-4">
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="surface-panel overflow-hidden"
      >
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <BellRing className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.notifTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.notifDesc")}
          </p>
        </div>
        <div className="panel-body space-y-5">
          <div>
            <p className="section-label mb-2">{t("admin.notifChannels")}</p>
            <div className="space-y-2.5">
              {CHANNELS.map((row) => (
                <PolicyRow
                  key={row.key}
                  icon={row.icon}
                  title={t(row.title)}
                  desc={t(row.desc)}
                  checked={Boolean(policy[row.key])}
                  onCheckedChange={(v) => onChange(row.key, v)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="section-label mb-2">{t("admin.notifCategories")}</p>
            <p className="mb-2 text-xs text-muted-foreground">
              {t("admin.notifCategoriesHint")}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {CATEGORIES.map((row) => (
                <PolicyRow
                  key={row.key}
                  title={t(row.title)}
                  desc={t(row.desc)}
                  checked={Boolean(policy[row.key])}
                  onCheckedChange={(v) => onChange(row.key, v)}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <NotificationQuietHoursSection
        policy={policy}
        onChange={onChange}
        onPatch={onPatch}
      />

      <NotificationRetentionSection
        retentionDays={policy.retentionDays}
        onRetentionDaysChange={(retentionDays) => onPatch?.({ retentionDays })}
      />
    </div>
  );
}
