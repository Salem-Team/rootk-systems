"use client";

import { useState, type ReactElement } from "react";
import { History, MessageCircle, Phone } from "lucide-react";
import { CrmWhatsappSendDialog } from "@/components/crm/crm-whatsapp-send-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/use-translation";
import { allLeadContacts } from "@/lib/crm/lead-contacts";
import { beginPendingCall, readPendingCall } from "@/lib/crm/pending-call";
import {
  isPendingCallPersisted,
  settleDisplacedPendingCall,
} from "@/lib/crm/persist-pending-call";
import { telHref, whatsappHref } from "@/lib/crm/phone-links";
import { emitCrmUpdated } from "@/lib/events";
import { nativePlatform } from "@/lib/native/platform";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/types/crm";

interface CrmLeadRowActionsProps {
  lead: CrmLead;
  onViewHistory: (lead: CrmLead) => void;
  className?: string;
  /** Mobile cards use comfortable targets; desktop table stays compact. */
  density?: "comfortable" | "compact";
}

const actionBtnClass =
  "inline-flex shrink-0 touch-manipulation items-center justify-center text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35";

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
  density = "compact",
}: CrmLeadRowActionsProps) {
  const { t } = useTranslation();
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const comfortable = density === "comfortable";
  const btnSize = comfortable
    ? "h-11 w-11 rounded-xl"
    : "h-8 w-8 rounded-md max-lg:h-11 max-lg:w-11 max-lg:rounded-xl";
  const iconSize = comfortable
    ? "h-4 w-4"
    : "h-3.5 w-3.5 max-lg:h-4 max-lg:w-4";
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
      void settleDisplacedPendingCall(previous).then((res) => {
        if (res && isPendingCallPersisted(res)) emitCrmUpdated();
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
        className={cn(
          "inline-flex items-center justify-end gap-0.5",
          comfortable && "gap-1",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ActionTip label={t("crm.nextAction.call")}>
          {callUrl || waUrl ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("crm.nextAction.call")}
                  className={cn(
                    actionBtnClass,
                    btnSize,
                    "hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Phone className={iconSize} aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[12rem]"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {callUrl ? (
                  <DropdownMenuItem asChild>
                    <a href={callUrl} className="cursor-pointer" onClick={onDial}>
                      <Phone aria-hidden />
                      {t("crm.leads.phoneCall")}
                    </a>
                  </DropdownMenuItem>
                ) : null}
                {waUrl ? (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      window.setTimeout(() => setWhatsappOpen(true), 0);
                    }}
                  >
                    <MessageCircle aria-hidden />
                    {t("crm.nextAction.whatsapp")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              disabled
              aria-label={t("crm.nextAction.call")}
              className={cn(actionBtnClass, btnSize)}
            >
              <Phone className={iconSize} aria-hidden />
            </button>
          )}
        </ActionTip>

        <ActionTip label={t("crm.nextAction.whatsapp")}>
          {waUrl ? (
            <button
              type="button"
              aria-label={t("crm.nextAction.whatsapp")}
              className={cn(
                actionBtnClass,
                btnSize,
                "hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
              )}
              onClick={() => setWhatsappOpen(true)}
            >
              <MessageCircle className={iconSize} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-label={t("crm.nextAction.whatsapp")}
              className={cn(actionBtnClass, btnSize)}
            >
              <MessageCircle className={iconSize} aria-hidden />
            </button>
          )}
        </ActionTip>

        <ActionTip label={t("crm.leads.viewHistory")}>
          <button
            type="button"
            aria-label={t("crm.leads.viewHistory")}
            className={cn(
              actionBtnClass,
              btnSize,
              "hover:bg-muted hover:text-foreground"
            )}
            onClick={() => onViewHistory(lead)}
          >
            <History className={iconSize} aria-hidden />
          </button>
        </ActionTip>
      </div>
      {waUrl ? (
        <CrmWhatsappSendDialog
          open={whatsappOpen}
          onOpenChange={setWhatsappOpen}
          targetPhone={phone}
          targetHref={waUrl}
          leadId={lead.id}
          leadName={lead.name}
        />
      ) : null}
    </TooltipProvider>
  );
}
