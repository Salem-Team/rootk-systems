"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  getApprovalRules,
  updateApprovalRule,
} from "@/services/org.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { TranslationPath } from "@/i18n";
import type { ApprovalRule } from "@/types/org";

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
        <p className="mt-2 text-xs text-muted-foreground">
          {t("admin.approvalsLeaveHint")}
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
