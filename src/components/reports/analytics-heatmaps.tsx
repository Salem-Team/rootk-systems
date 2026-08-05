"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buildDeptHeatmap,
  buildWeekHeatmap,
  type HeatCell,
} from "@/components/reports/analytics-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";

const LEVEL: Record<HeatCell["level"], string> = {
  0: "bg-muted",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary",
};

export function AnalyticsHeatmaps() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const deptHeat = useMemo(() => buildDeptHeatmap(), []);
  const weekHeat = useMemo(() => buildWeekHeatmap(), []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <HeatmapCard
        title={t("analytics.heatmapDept")}
        description={t("analytics.heatmapDeptDesc")}
        cells={deptHeat}
        reduceMotion={!!reduceMotion}
        translateRow={(row) => t(`departments.${row}` as TranslationPath)}
      />
      <HeatmapCard
        title={t("analytics.heatmapWeek")}
        description={t("analytics.heatmapWeekDesc")}
        cells={weekHeat}
        reduceMotion={!!reduceMotion}
        translateRow={(row) => t(`analytics.${row}` as TranslationPath)}
      />
    </div>
  );
}

function HeatmapCard({
  title,
  description,
  cells,
  reduceMotion,
  translateRow,
}: {
  title: string;
  description: string;
  cells: HeatCell[];
  reduceMotion: boolean;
  translateRow?: (row: string) => string;
}) {
  const { t } = useTranslation();
  const rows = Array.from(new Set(cells.map((c) => c.row)));
  const cols = Array.from(new Set(cells.map((c) => c.col)));
  const map = new Map(cells.map((c) => [`${c.row}-${c.col}`, c.level]));

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="panel-body overflow-x-auto">
        <div
          className="inline-grid gap-1"
          style={{
            gridTemplateColumns: `minmax(88px,auto) repeat(${cols.length}, 28px)`,
          }}
          role="img"
          aria-label={title}
        >
          <span />
          {cols.map((col) => (
            <span
              key={col}
              className="text-center text-[9px] font-medium text-muted-foreground"
            >
              {col}
            </span>
          ))}
          {rows.map((row) => (
            <div key={row} className="contents">
              <span className="truncate pe-2 text-[11px] text-muted-foreground">
                {translateRow ? translateRow(row) : row}
              </span>
              {cols.map((col) => {
                const level = map.get(`${row}-${col}`) ?? 0;
                return (
                  <motion.span
                    key={`${row}-${col}`}
                    whileHover={reduceMotion ? undefined : { scale: 1.15 }}
                    className={cn(
                      "h-7 w-7 rounded-md",
                      LEVEL[level as HeatCell["level"]]
                    )}
                    title={`${row} · ${col}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{t("attendance.heatmapLess")}</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={cn("h-2.5 w-2.5 rounded-sm", LEVEL[l])} />
          ))}
          <span>{t("attendance.heatmapMore")}</span>
        </div>
      </div>
    </motion.section>
  );
}
