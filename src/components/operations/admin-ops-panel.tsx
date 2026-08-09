"use client";

import { OpsWidget } from "@/components/operations/ops-widget";
import { buildOpsAlerts } from "@/components/operations/operations-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types";

export function AdminOpsPanel({
  stats,
  activitiesCount,
}: {
  stats: DashboardStats;
  activitiesCount: number;
}) {
  const { t } = useTranslation();
  const alerts = buildOpsAlerts();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <OpsWidget
        id="admin-pulse"
        title={t("ops.adminPulse")}
        description={t("ops.adminPulseDesc")}
      >
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <PulseStat label={t("dashboard.present")} value={stats.present} />
          <PulseStat label={t("dashboard.late")} value={stats.late} />
          <PulseStat label={t("dashboard.wfh")} value={stats.wfh} />
          <PulseStat label={t("dashboard.absent")} value={stats.absent} />
          <PulseStat
            label={t("dashboard.attendanceRate")}
            value={`${stats.attendanceRate}%`}
          />
          <PulseStat label={t("ops.liveEvents")} value={activitiesCount} />
        </dl>
      </OpsWidget>

      <OpsWidget
        id="admin-alerts"
        title={t("ops.adminAlerts")}
        description={t("ops.adminAlertsDesc")}
        className="lg:col-span-2"
      >
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                a.severity === "critical" &&
                  "border-rose-500/25 bg-rose-500/[0.06]",
                a.severity === "warn" &&
                  "border-amber-500/25 bg-amber-500/[0.06]",
                a.severity === "info" && "border-sky-500/25 bg-sky-500/[0.06]"
              )}
            >
              <p className="text-sm font-semibold">{t(a.titleKey)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(a.bodyKey)}
              </p>
            </li>
          ))}
        </ul>
      </OpsWidget>
    </div>
  );
}

function PulseStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border/60 px-2.5 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
