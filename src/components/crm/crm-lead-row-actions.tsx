"use client";

import type { ReactElement } from "react";
import { History, MessageCircle, Phone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { allLeadContacts } from "@/lib/crm/lead-contacts";
import { beginPendingCall, readPendingCall } from "@/lib/crm/pending-call";
import { persistPendingCrmCall } from "@/lib/crm/persist-pending-call";
import { telHref, whatsappHref } from "@/lib/crm/phone-links";
import { emitCrmUpdated } from "@/lib/events";
import { nativePlatform } from "@/lib/native/platform";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/types/crm";

interface CrmLeadRowActionsProps {
  lead: CrmLead;
  onViewHistory: (lead: CrmLead) => void;
  className?: string;
}

const actionBtnClass =
  "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35 md:h-8 md:w-8 md:rounded-md";

function ActionTip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** Compact Call / WhatsApp / History actions for a leads table row. */
export function CrmLeadRowActions({
  lead,
  onViewHistory,
  className,
}: CrmLeadRowActionsProps) {
  const { t } = useTranslation();
  const primary = allLeadContacts(
    lead.phone,
    lead.phoneNormalized,
    lead.contacts,
    lead.contactKind
  )[0];
  const phone = primary?.phone?.trim() || lead.phone.trim();
  const callUrl = phone ? telHref(phone) : null;
  const waUrl = phone ? whatsappHref(phone) : null;

  function onDial() {
    if (!phone) return;
    const previous = readPendingCall();
    if (previous?.externalCallId) {
      void persistPendingCrmCall(previous, { status: "unknown" }).then((res) => {
        if (res.success) emitCrmUpdated();
      });
    }
    beginPendingCall({
      leadId: lead.id,
      leadName: lead.name.trim() || phone,
      phone,
      source: nativePlatform(),
    });
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className={cn("inline-flex items-center justify-end gap-1 md:gap-0.5", className)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ActionTip label={t("crm.nextAction.call")}>
          {callUrl ? (
            <a
              href={callUrl}
              aria-label={t("crm.nextAction.call")}
              className={cn(actionBtnClass, "hover:bg-muted hover:text-foreground")}
              onClick={onDial}
            >
              <Phone className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden />
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label={t("crm.nextAction.call")}
              className={actionBtnClass}
            >
              <Phone className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden />
            </button>
          )}
        </ActionTip>

        <ActionTip label={t("crm.nextAction.whatsapp")}>
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("crm.nextAction.whatsapp")}
              className={cn(
                actionBtnClass,
                "hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
              )}
            >
              <MessageCircle className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden />
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label={t("crm.nextAction.whatsapp")}
              className={actionBtnClass}
            >
              <MessageCircle className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden />
            </button>
          )}
        </ActionTip>

        <ActionTip label={t("crm.leads.viewHistory")}>
          <button
            type="button"
            aria-label={t("crm.leads.viewHistory")}
            className={cn(actionBtnClass, "hover:bg-muted hover:text-foreground")}
            onClick={() => onViewHistory(lead)}
          >
            <History className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden />
          </button>
        </ActionTip>
      </div>
    </TooltipProvider>
  );
}
