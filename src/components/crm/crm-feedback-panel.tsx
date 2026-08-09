"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHART } from "@/constants/chart-colors";
import { chartTooltipStyle } from "@/constants/chart-tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmList } from "@/lib/crm-normalize";
import { cn } from "@/lib/utils";
import type {
  CrmChartPoint,
  CrmFeedbackType,
  CrmLead,
  CrmLeadFeedback,
} from "@/types/crm";

interface CrmFeedbackPanelProps {
  feedback: CrmLeadFeedback[];
  feedbackTypes: CrmFeedbackType[];
  leads: CrmLead[];
  reasons?: CrmChartPoint[];
  loading?: boolean;
  onLeadClick?: (leadId: string) => void;
  className?: string;
}

function formatWhen(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return iso;
  }
}

/** Feedback list + top reasons chart. */
export function CrmFeedbackPanel({
  feedback: feedbackProp,
  feedbackTypes: feedbackTypesProp,
  leads: leadsProp,
  reasons = [],
  loading = false,
  onLeadClick,
  className,
}: CrmFeedbackPanelProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [typeId, setTypeId] = useState("all");
  const feedback = ensureCrmList<CrmLeadFeedback>(feedbackProp);
  const feedbackTypes = ensureCrmList<CrmFeedbackType>(feedbackTypesProp);
  const leads = ensureCrmList<CrmLead>(leadsProp);
  const reasonRows = ensureCrmList<CrmChartPoint>(reasons);

  const typeMap = useMemo(
    () => new Map(feedbackTypes.map((f) => [f.id, f.name])),
    [feedbackTypes]
  );
  const leadMap = useMemo(
    () => new Map(leads.map((l) => [l.id, l.name])),
    [leads]
  );

  const filtered = useMemo(
    () =>
      typeId === "all"
        ? feedback
        : feedback.filter((f) => f.feedbackTypeId === typeId),
    [feedback, typeId]
  );

  const localReasons = useMemo(() => {
    if (reasonRows.length > 0) return reasonRows;
    const counts = new Map<string, number>();
    for (const row of feedback) {
      counts.set(row.feedbackTypeId, (counts.get(row.feedbackTypeId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, value]) => ({
        key,
        label: typeMap.get(key) ?? key,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [feedback, reasonRows, typeMap]);

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className={cn("space-y-4", className)}>
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <h2 className="text-sm font-semibold tracking-tight">
            {t("crm.feedback.reasonsChart")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("crm.feedback.reasonsChartDesc")}
          </p>
        </div>
        <div className="panel-body h-[240px]">
          {localReasons.length === 0 ? (
            <EmptyState compact title={t("crm.empty.chart")} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={localReasons}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar
                  dataKey="value"
                  fill={CHART.accent}
                  radius={[0, 6, 6, 0]}
                  animationDuration={reduceMotion ? 0 : 900}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="surface-panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">
            {t("crm.feedback.title")}
          </h2>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger className="h-9 w-[180px]" aria-label={t("crm.feedback.filterType")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("crm.feedback.allTypes")}</SelectItem>
              {feedbackTypes.map((ft) => (
                <SelectItem key={ft.id} value={ft.id}>
                  {ft.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t("crm.empty.feedback")}
              description={t("crm.empty.feedbackDesc")}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!onLeadClick}
                  onClick={() => onLeadClick?.(item.leadId)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-3 text-start sm:px-4",
                    onLeadClick
                      ? "transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      : "cursor-default"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-semibold">
                      {typeMap.get(item.feedbackTypeId) ?? item.feedbackTypeId}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatWhen(item.createdAt)}
                    </span>
                  </div>
                  {item.customerFeedback ? (
                    <p className="text-[12px] text-muted-foreground">
                      {item.customerFeedback}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground/80">
                    {t("crm.feedback.lead")}:{" "}
                    {leadMap.get(item.leadId) ?? item.leadId}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
