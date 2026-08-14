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
import type { CrmInteractionCallDetail } from "@/types/crm";

interface CrmCallFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  calls: CrmInteractionCallDetail[];
}

function formatWhen(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy · h:mm a");
  } catch {
    return iso || "—";
  }
}

/** Popup listing call feedback rows for Active/Inactive drill-down. */
export function CrmCallFeedbackDialog({
  open,
  onOpenChange,
  title,
  description,
  calls,
}: CrmCallFeedbackDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(36rem,85dvh)] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 pe-6">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          {calls.length === 0 ? (
            <EmptyState compact title={t("crm.interactions.emptyCalls")} />
          ) : (
            <ul className="space-y-2">
              {calls.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border/70 bg-card px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {item.leadName}
                      </p>
                      {item.companyName ? (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.companyName}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.callAnswered
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                          : "border-rose-500/40 text-rose-700 dark:text-rose-400"
                      }
                    >
                      {item.callAnswered
                        ? t("crm.feedback.activeCall")
                        : t("crm.feedback.inactiveCall")}
                    </Badge>
                  </div>

                  <p className="mt-2 text-[12px] font-medium">
                    {item.callAnswered
                      ? t("crm.feedback.answered")
                      : t("crm.feedback.noAnswer")}
                  </p>

                  {item.customerFeedback ? (
                    <p className="mt-1 whitespace-pre-wrap text-[13px] text-foreground">
                      {item.customerFeedback}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {t("crm.interactions.noFeedbackText")}
                    </p>
                  )}

                  {item.notes ? (
                    <p className="mt-1.5 text-[12px] text-muted-foreground">
                      {t("crm.feedback.notes")}: {item.notes}
                    </p>
                  ) : null}

                  {item.meetingMode ? (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {t("crm.interactions.meetings")}:{" "}
                      {item.meetingMode === "online"
                        ? t("crm.feedback.meetingOnline")
                        : t("crm.feedback.meetingOffline")}
                      {item.meetingLocation
                        ? ` · ${
                            item.meetingLocation === "our_company"
                              ? t("crm.interactions.ourCompany")
                              : t("crm.interactions.clientCompany")
                          }`
                        : ""}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      {t("crm.feedback.recordedBy")}:{" "}
                      <span className="font-medium text-foreground">
                        {item.recordedByEmployeeName || "—"}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatWhen(item.createdAt)}
                    </span>
                    {item.nextAction && item.nextAction !== "none" ? (
                      <span>
                        {t("crm.feedback.nextAction")}:{" "}
                        {t(`crm.nextAction.${item.nextAction}` as TranslationPath)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
