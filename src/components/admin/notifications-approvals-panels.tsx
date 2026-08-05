"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  ClipboardCheck,
  Loader2,
  Mail,
  Moon,
  RotateCcw,
  Smartphone,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getApprovalRules,
  updateApprovalRule,
} from "@/services/org.service";
import { resetAllEmployeeNotificationsToCompany } from "@/services/user-preferences.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { normalizeCompanyNotifications } from "@/lib/notification-policy";
import type { CompanyNotificationSettings } from "@/lib/notification-policy";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";
import type { CompanySettings } from "@/types";
import type { ApprovalRule } from "@/types/org";

type BoolPolicyKey = {
  [K in keyof CompanyNotificationSettings]: CompanyNotificationSettings[K] extends boolean
    ? K
    : never;
}[keyof CompanyNotificationSettings];

function PolicyRow({
  title,
  desc,
  checked,
  onCheckedChange,
  icon: Icon,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: typeof Bell;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  );
}

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
  const [resetting, setResetting] = useState(false);

  const channels: {
    key: BoolPolicyKey;
    title: TranslationPath;
    desc: TranslationPath;
    icon: typeof Bell;
  }[] = [
    {
      key: "inApp",
      title: "admin.notifInApp",
      desc: "admin.notifInAppDesc",
      icon: Bell,
    },
    {
      key: "email",
      title: "settings.emailNotif",
      desc: "admin.notifEmailDesc",
      icon: Mail,
    },
    {
      key: "push",
      title: "settings.pushNotif",
      desc: "admin.notifPushDesc",
      icon: Smartphone,
    },
    {
      key: "sound",
      title: "settings.soundNotif",
      desc: "admin.notifSoundDesc",
      icon: Volume2,
    },
  ];

  const categories: {
    key: BoolPolicyKey;
    title: TranslationPath;
    desc: TranslationPath;
  }[] = [
    {
      key: "attendanceReminders",
      title: "settings.attendanceReminders",
      desc: "admin.notifAttendanceDesc",
    },
    {
      key: "leaveUpdates",
      title: "settings.leaveUpdates",
      desc: "admin.notifLeaveDesc",
    },
    {
      key: "schedule",
      title: "admin.notifSchedule",
      desc: "admin.notifScheduleDesc",
    },
    {
      key: "work",
      title: "admin.notifWork",
      desc: "admin.notifWorkDesc",
    },
    {
      key: "payroll",
      title: "admin.notifPayroll",
      desc: "admin.notifPayrollDesc",
    },
    {
      key: "announcements",
      title: "admin.notifAnnouncements",
      desc: "admin.notifAnnouncementsDesc",
    },
    {
      key: "mention",
      title: "admin.notifMention",
      desc: "admin.notifMentionDesc",
    },
    {
      key: "system",
      title: "admin.notifSystem",
      desc: "admin.notifSystemDesc",
    },
  ];

  async function resetEmployeePrefs() {
    setResetting(true);
    const res = await resetAllEmployeeNotificationsToCompany();
    setResetting(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(
      t("admin.notifResetDone", { count: res.data.resetCount })
    );
  }

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
              {channels.map((row) => (
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
              {categories.map((row) => (
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

      <motion.section
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="surface-panel overflow-hidden"
      >
        <div className="panel-header">
          <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
            <Moon className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("admin.notifQuietTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.notifQuietDesc")}
          </p>
        </div>
        <div className="panel-body space-y-3">
          <PolicyRow
            title={t("admin.notifQuietEnable")}
            desc={t("admin.notifQuietEnableDesc")}
            checked={policy.quietHoursEnabled}
            onCheckedChange={(v) => onChange("quietHoursEnabled", v)}
          />
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2",
              !policy.quietHoursEnabled && "pointer-events-none opacity-45"
            )}
          >
            <div className="space-y-1.5">
              <Label htmlFor="quiet-start">{t("admin.notifQuietStart")}</Label>
              <Input
                id="quiet-start"
                type="time"
                value={policy.quietHoursStart}
                onChange={(e) =>
                  onPatch?.({ quietHoursStart: e.target.value || "22:00" })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiet-end">{t("admin.notifQuietEnd")}</Label>
              <Input
                id="quiet-end"
                type="time"
                value={policy.quietHoursEnd}
                onChange={(e) =>
                  onPatch?.({ quietHoursEnd: e.target.value || "07:00" })
                }
              />
            </div>
          </div>
          <PolicyRow
            title={t("admin.notifQuietUrgent")}
            desc={t("admin.notifQuietUrgentDesc")}
            checked={policy.quietAllowUrgent}
            onCheckedChange={(v) => onChange("quietAllowUrgent", v)}
          />
        </div>
      </motion.section>

      <motion.section
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="surface-panel overflow-hidden"
      >
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">
            {t("admin.notifRetentionTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("admin.notifRetentionDesc")}
          </p>
        </div>
        <div className="panel-body space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="retention">{t("admin.notifRetentionDays")}</Label>
            <Input
              id="retention"
              type="number"
              min={0}
              max={3650}
              value={policy.retentionDays}
              onChange={(e) =>
                onPatch?.({
                  retentionDays: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t("admin.notifRetentionHint")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">{t("admin.notifResetTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("admin.notifResetDesc")}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={resetting}
              onClick={() => void resetEmployeePrefs()}
            >
              {resetting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              {t("admin.notifResetAction")}
            </Button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

export function ApprovalsPanel() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void getApprovalRules().then((res) => {
      if (!mounted) return;
      if (res.success) setRules(res.data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function onToggle(id: string, requiresApproval: boolean) {
    const res = await updateApprovalRule(id, requiresApproval);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setRules(res.data);
    toast.success(t("admin.approvalSaved"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <ClipboardCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("admin.approvalsTitle")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("admin.approvalsDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="panel-body space-y-2.5"
      >
        {rules.map((rule) => (
          <motion.li
            key={rule.id}
            variants={fadeInUp}
            className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3"
          >
            <div>
              <p className="text-sm font-medium">
                {t(rule.labelKey as TranslationPath)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("admin.approver")}: {rule.approver}
              </p>
            </div>
            <Switch
              checked={rule.requiresApproval}
              onCheckedChange={(v) => void onToggle(rule.id, v)}
              aria-label={t(rule.labelKey as TranslationPath)}
            />
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
