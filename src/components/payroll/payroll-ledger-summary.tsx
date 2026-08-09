import type { ReactNode } from "react";
import { Calculator, CheckCircle2, Clock3, RefreshCw, RotateCcw, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { PayrollDashboardSummary } from "@/types/payroll";

export function PayrollLedgerSummary({
  summary,
  loc,
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
    <section className="surface-panel overflow-hidden">
      <div className="panel-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[0.95rem] font-semibold">
            {t("payroll.ledgerTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("payroll.ledgerDesc", { period: summary.period.label })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{summary.period.label}</Badge>
          <Badge variant="info">
            {t(`payroll.status.${summary.run.status}`)}
          </Badge>
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
      <div className="panel-body grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label={t("payroll.employeesIncluded")}
          value={String(summary.run.employeeCount ?? summary.employeesIncluded)}
        />
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label={t("payroll.netPayroll")}
          value={formatEgp(summary.run.netPayroll ?? summary.netPayroll, loc)}
        />
        <Kpi
          icon={<Clock3 className="h-4 w-4" />}
          label={t("payroll.totalDeductions")}
          value={formatEgp(
            summary.run.totalDeductions ?? summary.totalDeductions,
            loc
          )}
        />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4" />}
          label={t("payroll.attendanceLinked")}
          value={t("payroll.attendanceLinkedValue")}
        />
      </div>
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
