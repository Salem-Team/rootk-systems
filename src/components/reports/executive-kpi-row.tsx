"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Clock,
  Gauge,
  Home,
  Percent,
  Plane,
  Timer,
  TrendingUp,
  UserX,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { buildExecutiveKpis } from "@/components/reports/analytics-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { TranslationPath } from "@/i18n";

const ICONS = {
  rate: Percent,
  hours: Timer,
  late: Clock,
  absent: UserX,
  leave: Plane,
  efficiency: Gauge,
  productivity: TrendingUp,
  wfh: Home,
} as const;

export function ExecutiveKpiRow() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const kpis = buildExecutiveKpis();

  return (
    <section aria-label={t("analytics.executiveOverview")}>
      <motion.div
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpis.map((kpi) => (
          <motion.div key={kpi.id} variants={fadeInUp}>
            <KpiCard
              label={t(kpi.labelKey as TranslationPath)}
              value={kpi.value}
              suffix={kpi.suffix}
              decimals={kpi.decimals}
              icon={ICONS[kpi.id as keyof typeof ICONS] ?? TrendingUp}
              tone={kpi.tone}
              trend={kpi.trend}
              spark={kpi.spark}
              badge={t(kpi.badgeKey as TranslationPath)}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
