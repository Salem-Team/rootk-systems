"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OpsWidget } from "@/components/operations/ops-widget";
import { getTargets } from "@/services/targets.service";
import { useLiveReload } from "@/hooks/use-live-reload";
import { getWorkEmployeeIdFromUser, useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/hooks/use-translation";
import { TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT } from "@/lib/events";
import type { PerformanceTarget } from "@/types/targets";

export function GoalsWidget() {
  const { t } = useTranslation();
  const router = useRouter();
  const workEmployeeId = useSessionStore((s) =>
    getWorkEmployeeIdFromUser(s.user)
  );
  const [targets, setTargets] = useState<PerformanceTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await getTargets({ employeeId: workEmployeeId });
    if (res.success) setTargets(res.data);
    setLoading(false);
  }, [workEmployeeId]);

  useLiveReload(reload, [TARGETS_UPDATED_EVENT, WORK_UPDATED_EVENT]);

  const open = targets.filter(
    (x) => x.status !== "completed" && x.status !== "cancelled" && x.status !== "archived"
  );

  return (
    <OpsWidget
      id="goals"
      title={t("ops.goalsTitle")}
      description={t("ops.goalsDesc")}
      actions={
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          onClick={() => router.push("/targets")}
        >
          {t("ops.goalsOpenAll")}
        </Button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : open.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center">
          <p className="text-sm font-medium">{t("ops.goalsEmpty")}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t("ops.goalsEmptyHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {open.slice(0, 5).map((g) => {
            const pct = Math.round(
              (g.completedQuantity / Math.max(1, g.quantity)) * 100
            );
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className="w-full rounded-lg text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  onClick={() => router.push("/targets")}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 px-1 text-sm">
                    <span className="min-w-0 truncate font-medium">{g.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="px-1">
                    <Progress value={pct} className="h-1.5" />
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {g.completedQuantity}/{g.quantity} {g.unit}
                      </span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {t("ops.goalsAssignedBadge")}
                      </Badge>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </OpsWidget>
  );
}
