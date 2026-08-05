"use client";

import { Badge } from "@/components/ui/badge";
import { SoftListRow } from "@/components/shared/meta-chip";
import { StaggerList, StaggerListItem } from "@/components/shared/stagger";
import { formatEgp } from "@/lib/payroll";
import { useTranslation } from "@/hooks/use-translation";
import type { PayslipHistoryItem } from "@/types/payroll";

const STATUS_VARIANT: Record<
  string,
  "info" | "warning" | "success" | "secondary"
> = {
  draft: "secondary",
  hr_review: "info",
  finance_review: "warning",
  approved: "success",
  paid: "success",
  cancelled: "secondary",
};

export function PayslipHistoryPanel({
  items,
}: {
  items: PayslipHistoryItem[];
}) {
  const { t, locale } = useTranslation();
  const loc = locale === "ar" ? "ar" : "en";

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="text-[0.95rem] font-semibold">
          {t("payroll.payslipHistory")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("payroll.payslipHistoryDesc")}
        </p>
      </div>
      <StaggerList speed="fast" className="space-y-2 p-3">
        {items.map((item) => (
          <StaggerListItem key={item.id}>
            <SoftListRow
              as="div"
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <div>
                <p className="font-semibold">{item.periodLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {t("payroll.payDate")}: {item.payDate}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-end">
                  <p className="section-label">{t("payroll.netSalary")}</p>
                  <p className="font-semibold tabular-nums">
                    {formatEgp(item.net, loc)}
                  </p>
                </div>
                <div className="text-end">
                  <p className="section-label">{t("payroll.gross")}</p>
                  <p className="tabular-nums text-muted-foreground">
                    {formatEgp(item.gross, loc)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[item.status] ?? "info"}>
                  {t(`payroll.status.${item.status}`)}
                </Badge>
              </div>
            </SoftListRow>
          </StaggerListItem>
        ))}
      </StaggerList>
    </section>
  );
}
