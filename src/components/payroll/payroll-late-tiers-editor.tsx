import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollPolicies } from "@/types/payroll";
import { parseNum } from "./payroll-policy-fields";

type LateTier = PayrollPolicies["late"]["tiers"][number];

export function LateTiersEditor({
  tiers,
  editable,
  onChange,
}: {
  tiers: LateTier[];
  editable: boolean;
  onChange: (tiers: LateTier[]) => void;
}) {
  const { t } = useTranslation();

  function updateTier(index: number, patch: Partial<LateTier>) {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    onChange([
      ...tiers,
      {
        afterMinutes: (last?.afterMinutes ?? 0) + 15,
        dayFraction: Math.min(1, (last?.dayFraction ?? 0.25) + 0.25),
      },
    ]);
  }

  function removeTier(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/70 p-3 sm:col-span-2 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{t("payroll.lateTiersTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("payroll.lateTiersDesc")}
          </p>
        </div>
        {editable ? (
          <Button type="button" size="sm" variant="outline" onClick={addTier}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("payroll.lateTierAdd")}
          </Button>
        ) : null}
      </div>
      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("payroll.lateTiersEmpty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <div
              key={`tier-${index}`}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border border-border/50 p-2.5"
            >
              <div className="space-y-1">
                <Label htmlFor={`late-after-${index}`}>
                  {t("payroll.lateTierAfter")}
                </Label>
                <Input
                  id={`late-after-${index}`}
                  type="number"
                  min={0}
                  disabled={!editable}
                  value={tier.afterMinutes}
                  onChange={(e) =>
                    updateTier(index, {
                      afterMinutes: parseNum(e.target.value, 0),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`late-frac-${index}`}>
                  {t("payroll.lateTierFraction")}
                </Label>
                <Input
                  id={`late-frac-${index}`}
                  type="number"
                  step={0.25}
                  min={0}
                  max={1}
                  disabled={!editable}
                  value={tier.dayFraction}
                  onChange={(e) =>
                    updateTier(index, {
                      dayFraction: parseNum(e.target.value, 0),
                    })
                  }
                />
              </div>
              {editable ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  disabled={tiers.length <= 1}
                  onClick={() => removeTier(index)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
