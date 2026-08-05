"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import {
  buildHeatmap,
  type HeatmapLevel,
} from "@/components/attendance/attendance-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

const LEVEL_CLASS: Record<HeatmapLevel, string> = {
  0: "bg-muted",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary",
};

interface AttendanceHeatmapProps {
  records: AttendanceRecord[];
}

export function AttendanceHeatmap({ records }: AttendanceHeatmapProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const days = useMemo(() => buildHeatmap(records, 16), [records]);

  const weeks = useMemo(() => {
    const cols: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      cols.push(days.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  return (
    <motion.div
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-[0.95rem] font-semibold">{t("attendance.heatmapTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("attendance.heatmapDesc")}</p>
        </div>
        <div className="panel-body space-y-3">
          <div
            className="overflow-x-auto pb-1"
            role="img"
            aria-label={t("attendance.heatmapTitle")}
          >
            <div className="inline-flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <motion.span
                      key={day.date}
                      title={`${format(parseISO(day.date), "MMM d")} · ${day.kind}`}
                      whileHover={
                        reduceMotion ? undefined : { scale: 1.25 }
                      }
                      className={cn(
                        "h-3 w-3 rounded-[3px] transition-transform",
                        LEVEL_CLASS[day.level]
                      )}
                      aria-hidden
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{t("attendance.heatmapLess")}</span>
            {([0, 1, 2, 3, 4] as HeatmapLevel[]).map((level) => (
              <span
                key={level}
                className={cn("h-3 w-3 rounded-[3px]", LEVEL_CLASS[level])}
                aria-hidden
              />
            ))}
            <span>{t("attendance.heatmapMore")}</span>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
