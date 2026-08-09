import { format, parseISO } from "date-fns";
import type { enUS } from "date-fns/locale";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SoftListRow } from "@/components/shared/meta-chip";
import { useTranslation } from "@/hooks/use-translation";
import { getWorkEmployeeId } from "@/stores/session-store";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetWarning } from "@/types/targets";

export function WarningListItem({
  warning,
  target,
  employees,
  dateLocale,
  busyId,
  onAcknowledge,
}: {
  warning: TargetWarning;
  target: PerformanceTarget | undefined;
  employees: Map<string, Employee>;
  dateLocale: typeof enUS;
  busyId: string | null;
  onAcknowledge: (id: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const isMine = warning.employeeId === getWorkEmployeeId();

  return (
    <SoftListRow className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {target?.title ?? warning.targetId}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {employees.get(warning.employeeId)?.name ?? warning.employeeId}
            {" · "}
            {format(parseISO(warning.createdAt), "d MMM yyyy", {
              locale: dateLocale,
            })}
          </p>
        </div>
        <Badge variant="warning">
          {t(`targets.warnings.penaltyTypes.${warning.penaltyType}`)}
        </Badge>
      </div>
      <p className="text-[13px] leading-relaxed">{warning.reason}</p>
      {warning.requiredAction ? (
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("targets.warnings.requiredAction")}:
          </span>{" "}
          {warning.requiredAction}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        {warning.acknowledgedAt ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t("targets.warnings.acknowledgedAt", {
              date: format(parseISO(warning.acknowledgedAt), "d MMM yyyy", {
                locale: dateLocale,
              }),
            })}
          </span>
        ) : isMine ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === warning.id}
            onClick={() => void onAcknowledge(warning.id)}
          >
            {busyId === warning.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {t("targets.warnings.acknowledge")}
          </Button>
        ) : (
          <span className="text-[12px] text-muted-foreground">
            {t("targets.warnings.pendingAck")}
          </span>
        )}
      </div>
    </SoftListRow>
  );
}
