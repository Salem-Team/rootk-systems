"use client";

import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { DeductionCharge, DeductionChargeMode } from "@/types/org";

const DAY_PRESETS = [
  { labelKey: "admin.deductionFullDay" as const, value: 1 },
  { labelKey: "admin.deductionHalfDay" as const, value: 0.5 },
  { labelKey: "admin.deductionQuarterDay" as const, value: 0.25 },
];

export function DeductionChargeEditor({
  charge,
  onChange,
  currency,
}: {
  charge: DeductionCharge;
  onChange: (next: DeductionCharge) => void;
  currency: string;
}) {
  const { t } = useTranslation();
  const setMode = (mode: DeductionChargeMode) =>
    onChange({
      mode,
      value:
        mode === "day_fraction"
          ? Math.min(2, charge.mode === "day_fraction" ? charge.value : 0.5)
          : charge.mode === "fixed_amount"
            ? charge.value
            : 0,
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["day_fraction", t("admin.deductionByDays")],
            ["fixed_amount", t("admin.deductionByAmount")],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={charge.mode === mode}
            onClick={() => setMode(mode)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
              charge.mode === mode
                ? "border-primary/30 bg-primary/[0.08] text-primary"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {charge.mode === "day_fraction" ? (
        <div className="flex flex-wrap gap-1.5">
          {DAY_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ mode: "day_fraction", value: p.value })}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px]",
                charge.value === p.value
                  ? "border-primary/30 bg-primary/[0.08] text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={charge.mode === "day_fraction" ? 0.05 : 1}
          className="h-9 max-w-[9rem] font-mono tabular-nums"
          value={charge.value}
          onChange={(e) =>
            onChange({
              mode: charge.mode,
              value: Number(e.target.value) || 0,
            })
          }
        />
        <span className="text-xs text-muted-foreground">
          {charge.mode === "day_fraction"
            ? t("admin.deductionDayUnit")
            : currency}
        </span>
      </div>
    </div>
  );
}
