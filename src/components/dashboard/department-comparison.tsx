"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "@/constants/chart-colors";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { DepartmentStat } from "@/components/dashboard/dashboard-mock-data";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
};

export function DepartmentComparison({
  stats,
}: {
  stats: DepartmentStat[];
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const data = useMemo(
    () =>
      stats.slice(0, 6).map((row) => ({
        name: t(`departments.${row.department}`),
        rate: row.rate,
        present: row.present,
        late: row.late,
      })),
    [stats, t]
  );

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
      aria-labelledby="dept-compare-heading"
    >
      <div className="panel-header">
        <h3
          id="dept-compare-heading"
          className="text-[0.95rem] font-semibold tracking-tight"
        >
          {t("dashboard.departmentComparison")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("dashboard.departmentComparisonDesc")}
        </p>
      </div>
      <div className="panel-body h-[280px]" role="img" aria-label={t("dashboard.departmentComparison")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="%" />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="rate"
              name={t("charts.rate")}
              fill={CHART.rate}
              radius={[0, 6, 6, 0]}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
