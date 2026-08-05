"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildMonthlyAnalytics } from "@/components/attendance/attendance-mock-data";
import { CHART } from "@/constants/chart-colors";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { AttendanceRecord } from "@/types";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
};

interface MonthlyAnalyticsProps {
  records: AttendanceRecord[];
}

export function MonthlyAnalytics({ records }: MonthlyAnalyticsProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const data = useMemo(() => buildMonthlyAnalytics(records), [records]);

  return (
    <motion.div
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">{t("attendance.monthlyAnalytics")}</h3>
          <p className="text-sm text-muted-foreground">{t("attendance.monthlyAnalyticsDesc")}</p>
        </div>
        <div>
          <Tabs defaultValue="trend" className="w-full">
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="trend">{t("attendance.chartTrend")}</TabsTrigger>
              <TabsTrigger value="hours">{t("attendance.chartHours")}</TabsTrigger>
              <TabsTrigger value="late">{t("attendance.chartLate")}</TabsTrigger>
              <TabsTrigger value="compare">
                {t("attendance.chartCompare")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trend" className="mt-0">
              <div className="h-[260px] sm:h-[300px]" role="img" aria-label={t("attendance.chartTrend")}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      name={t("attendance.weekRate")}
                      stroke={CHART.rate}
                      fill={CHART.rate}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="hours" className="mt-0">
              <div className="h-[260px] sm:h-[300px]" role="img" aria-label={t("attendance.chartHours")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="hours"
                      name={t("common.hours")}
                      fill={CHART.hours}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="late" className="mt-0">
              <div className="h-[260px] sm:h-[300px]" role="img" aria-label={t("attendance.chartLate")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="late"
                      name={t("charts.late")}
                      fill={CHART.late}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="compare" className="mt-0">
              <div className="h-[260px] sm:h-[300px]" role="img" aria-label={t("attendance.chartCompare")}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar
                      dataKey="present"
                      name={t("charts.present")}
                      fill={CHART.present}
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="absent"
                      name={t("charts.absent")}
                      fill={CHART.absent}
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="late"
                      name={t("charts.late")}
                      stroke={CHART.late}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </motion.div>
  );
}
