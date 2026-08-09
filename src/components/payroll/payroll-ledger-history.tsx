import { format, parseISO } from "date-fns";
import type { enUS } from "date-fns/locale";
import { RefreshCw, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollDashboardSummary, PayrollRun } from "@/types/payroll";

export function PayrollRunsHistory({
  runs,
  dateLocale,
  loc,
}: {
  runs: PayrollRun[];
  dateLocale: typeof enUS;
  loc: "en" | "ar";
}) {
  const { t } = useTranslation();
  if (runs.length === 0) return null;

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">
          {t("payroll.runsHistory")}
        </h3>
      </div>
      <ul className="panel-body space-y-2">
        {runs.slice(0, 8).map((run) => (
          <li
            key={`${run.id}-${run.version}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">{run.periodId}</p>
              <p className="text-[11px] text-muted-foreground">
                {format(parseISO(run.updatedAt), "d MMM yyyy · h:mm a", {
                  locale: dateLocale,
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {t(`payroll.status.${run.status}`)}
              </Badge>
              <span className="text-sm font-semibold tabular-nums">
                {formatEgp(run.netPayroll, loc)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PayrollCancelRunDialog({
  open,
  onOpenChange,
  summary,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: PayrollDashboardSummary;
  busy: boolean;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payroll.cancelRunTitle")}</DialogTitle>
          <DialogDescription>
            {t("payroll.cancelRunBody", { period: summary.period.label })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {t("payroll.cancelRunConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
