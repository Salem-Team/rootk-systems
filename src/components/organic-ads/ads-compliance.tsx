"use client";

import { useState } from "react";
import { Check, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { TeamActivityRow } from "@/types/organic-ads";

interface AdsComplianceProps {
  rows: TeamActivityRow[];
  weeklyTarget: number;
  canManage?: boolean;
  onSaveTarget?: (target: number) => Promise<void>;
}

export function AdsCompliance({
  rows,
  weeklyTarget,
  canManage = false,
  onSaveTarget,
}: AdsComplianceProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(weeklyTarget));
  const [saving, setSaving] = useState(false);

  return (
    <section className="surface-panel">
      <div className="panel-header flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("organicAds.compliance.title")}
        </h2>
        {canManage && onSaveTarget ? (
          <div className="flex items-end gap-2">
            <div className="grid gap-1">
              <Label htmlFor="weekly-target" className="text-[11px]">
                {t("organicAds.compliance.target")}
              </Label>
              <Input
                id="weekly-target"
                type="number"
                min={0}
                max={50}
                className="h-9 w-24"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => {
                const n = Number(value);
                if (!Number.isFinite(n)) return;
                setSaving(true);
                try {
                  await onSaveTarget(Math.max(0, Math.min(50, Math.round(n))));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving
                ? t("organicAds.actions.saving")
                : t("organicAds.compliance.saveTarget")}
            </Button>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {t("organicAds.compliance.target")}: {weeklyTarget}
          </p>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <ul className="grid gap-2">
          {rows.map((row) => {
            const met = row.weeklyCount >= row.weeklyTarget;
            const missing = row.weeklyCount === 0;
            return (
              <li
                key={row.employeeId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="text-[13px] font-medium">{row.name}</span>
                <span className="flex items-center gap-2 font-mono text-[13px] tabular-nums">
                  {row.weeklyCount} / {row.weeklyTarget}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                      met
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                        : missing
                          ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    )}
                  >
                    {met ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : missing ? (
                      <XCircle className="h-3 w-3" aria-hidden />
                    ) : (
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                    )}
                    {met
                      ? t("organicAds.compliance.met")
                      : missing
                        ? t("organicAds.compliance.missing")
                        : t("organicAds.compliance.behind")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
