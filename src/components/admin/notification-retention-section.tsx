"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetAllEmployeeNotificationsToCompany } from "@/services/user-preferences.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";

export function NotificationRetentionSection({
  retentionDays,
  onRetentionDaysChange,
}: {
  retentionDays: number;
  onRetentionDaysChange: (days: number) => void;
}) {
  const { t } = useTranslation();
  const [resetting, setResetting] = useState(false);

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
            value={retentionDays}
            onChange={(e) =>
              onRetentionDaysChange(Math.max(0, Number(e.target.value) || 0))
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
  );
}
