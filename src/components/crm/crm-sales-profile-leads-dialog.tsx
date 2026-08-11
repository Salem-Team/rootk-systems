"use client";

import { format, parseISO } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationPath } from "@/i18n";
import type { CrmSalesProfileLead } from "@/types/crm";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM · HH:mm");
  } catch {
    return iso;
  }
}

export function CrmSalesProfileLeadsDialog({
  open,
  onOpenChange,
  title,
  employeeName,
  leads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  employeeName: string;
  leads: CrmSalesProfileLead[];
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[70]"
        className="z-[70] sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("crm.salesProfile.detailHint", { name: employeeName })}{" "}
            {t("crm.salesProfile.detailCount", { count: leads.length })}
          </DialogDescription>
        </DialogHeader>

        {leads.length === 0 ? (
          <EmptyState
            compact
            title={t("crm.salesProfile.detailEmpty")}
            description={t("crm.salesProfile.detailEmptyDesc")}
          />
        ) : (
          <ul className="grid max-h-[min(24rem,50dvh)] gap-2 overflow-y-auto pe-1">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {lead.name}
                    </p>
                    {lead.companyName ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lead.companyName}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {t(`crm.status.${lead.status}` as TranslationPath)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: lead.stageColor }}
                      aria-hidden
                    />
                    {lead.stageName || "—"}
                  </span>
                  <span className="font-mono tabular-nums">{lead.phone}</span>
                  <span>
                    {t(`crm.source.${lead.source}` as TranslationPath)}
                  </span>
                  {lead.nextFollowUpAt ? (
                    <span>
                      {t("crm.leadSheet.nextFollowUp")} ·{" "}
                      {formatWhen(lead.nextFollowUpAt)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
