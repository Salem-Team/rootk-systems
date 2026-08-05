"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { buildInsights } from "@/components/reports/analytics-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

const TONE_ICON = {
  good: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
} as const;

const TONE_STYLE = {
  good: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-500/20 bg-amber-500/[0.06] text-amber-800 dark:text-amber-300",
  info: "border-sky-500/20 bg-sky-500/[0.06] text-sky-800 dark:text-sky-300",
} as const;

export function ExecutiveInsightsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const insights = buildInsights();

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="insights-heading"
    >
      <div className="panel-header">
        <h3
          id="insights-heading"
          className="flex items-center gap-2 text-[0.95rem] font-semibold"
        >
          <Lightbulb className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("analytics.insightsTitle")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("analytics.insightsDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="panel-body space-y-2.5"
      >
        {insights.map((item) => {
          const Icon = TONE_ICON[item.tone];
          return (
            <motion.li
              key={item.id}
              variants={fadeInUp}
              className={cn(
                "flex gap-3 rounded-xl border px-3.5 py-3",
                TONE_STYLE[item.tone]
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {t(item.titleKey as TranslationPath)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(item.bodyKey as TranslationPath)}
                </p>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.section>
  );
}

export function ExportCenterPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const items = [
    {
      id: "pdf",
      title: "PDF",
      descKey: "analytics.exportPdfDesc" as TranslationPath,
      icon: Download,
    },
    {
      id: "excel",
      title: "Excel",
      descKey: "analytics.exportExcelDesc" as TranslationPath,
      icon: FileText,
    },
    {
      id: "csv",
      title: "CSV",
      descKey: "analytics.exportCsvDesc" as TranslationPath,
      icon: FileSpreadsheet,
    },
    {
      id: "print",
      title: t("analytics.print"),
      descKey: "analytics.exportPrintDesc" as TranslationPath,
      icon: Printer,
    },
  ];

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-3"
      aria-labelledby="export-heading"
    >
      <div>
        <h3
          id="export-heading"
          className="text-base font-semibold tracking-tight"
        >
          {t("analytics.exportCenter")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("analytics.exportCenterDesc")}
        </p>
      </div>
      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <motion.li key={item.id} variants={fadeInUp}>
              <button
                type="button"
                onClick={() =>
                  toast.success(t("analytics.exportQueued", { kind: item.title }))
                }
                className="surface-panel surface-panel-interactive flex w-full flex-col items-start gap-3 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="icon-well">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(item.descKey)}
                  </p>
                </div>
                <span className="inline-flex h-8 items-center rounded-md border border-border/90 bg-card px-3 text-xs font-semibold text-foreground shadow-[0_1px_2px_rgba(11,20,36,0.03)]">
                  {t("analytics.exportAction")}
                </span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.section>
  );
}
