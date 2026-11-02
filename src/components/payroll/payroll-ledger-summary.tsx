import { Calculator, RefreshCw, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollDashboardSummary } from "@/types/payroll";

export function PayrollLedgerSummary({
  summary,
  canAdvance,
  canCancel,
  busy,
  onAdvance,
  onRequestCancel,
}: {
  summary: PayrollDashboardSummary;
  loc: "en" | "ar";
  canAdvance: boolean;
  canCancel: boolean;
  busy: boolean;
  onAdvance: () => void;
  onRequestCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{summary.period.label}</Badge>
        <Badge variant="info">
          {t(`payroll.status.${summary.run.status}`)}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {canAdvance && summary.run.status !== "paid" ? (
          <Button size="sm" disabled={busy} onClick={onAdvance}>
            {busy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Calculator className="h-3.5 w-3.5" />
            )}
            {t("payroll.advanceStep")}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onRequestCancel}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("payroll.cancelRun")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
