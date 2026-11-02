"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { HeatCell } from "@/components/reports/analytics-mock-data";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/hooks/use-translation";
import { departmentLabel } from "@/lib/department-label";
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

const WEEK_ROW_KEYS: Record<string, TranslationPath> = {
  present: "status.present",
  late: "status.late",
  absent: "status.absent",
  wfh: "status.wfh",
};

export function AnalyticsHeatmaps({
  deptHeat = [],
  weekHeat = [],
}: {
  deptHeat?: HeatCell[];
  weekHeat?: HeatCell[];
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  if (deptHeat.length === 0 && weekHeat.length === 0) {
    return (
      <EmptyState
        compact
        title={t("reports.emptyTitle")}
        description={t("analytics.heatmapDeptDesc")}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <HeatmapCard
        title={t("analytics.heatmapDept")}
        description={t("analytics.heatmapDeptDesc")}
        cells={deptHeat}
        reduceMotion={!!reduceMotion}
        translateRow={(row) => departmentLabel(row, t)}
      />
      <HeatmapCard
        title={t("analytics.heatmapWeek")}
        description={t("analytics.heatmapWeekDesc")}
        cells={weekHeat}
        reduceMotion={!!reduceMotion}
        translateRow={(row) =>
          WEEK_ROW_KEYS[row] ? t(WEEK_ROW_KEYS[row]) : row
        }
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

  if (cells.length === 0) {
    return (
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="panel-body">
          <EmptyState compact title={t("reports.emptyTitle")} />
        </div>
      </section>
    );
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="surface-panel min-w-0 overflow-hidden"
    >
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="panel-body table-scroll">
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
