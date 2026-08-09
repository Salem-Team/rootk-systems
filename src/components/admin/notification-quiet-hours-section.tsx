import { motion } from "framer-motion";
import { Moon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Time12Input } from "@/components/ui/time-12-input";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { CompanyNotificationSettings } from "@/lib/notification-policy";
import { cn } from "@/lib/utils";
import { PolicyRow } from "./notification-policy-row";

export function NotificationQuietHoursSection({
  policy,
  onChange,
  onPatch,
}: {
  policy: CompanyNotificationSettings;
  onChange: (key: "quietHoursEnabled" | "quietAllowUrgent", value: boolean) => void;
  onPatch?: (patch: Partial<CompanyNotificationSettings>) => void;
}) {
  const { t } = useTranslation();

  return (
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
            <Time12Input
              id="quiet-start"
              value={policy.quietHoursStart}
              onChange={(quietHoursStart) =>
                onPatch?.({ quietHoursStart: quietHoursStart || "22:00" })
              }
              aria-label={t("admin.notifQuietStart")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiet-end">{t("admin.notifQuietEnd")}</Label>
            <Time12Input
              id="quiet-end"
              value={policy.quietHoursEnd}
              onChange={(quietHoursEnd) =>
                onPatch?.({ quietHoursEnd: quietHoursEnd || "07:00" })
              }
              aria-label={t("admin.notifQuietEnd")}
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
  );
}
