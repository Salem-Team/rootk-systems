"use client";

import { useState } from "react";
import { ExternalLink, MessageCircle, Phone, Send } from "lucide-react";
import { CrmWhatsappSendDialog } from "@/components/crm/crm-whatsapp-send-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LtrNum } from "@/components/shared/ltr-num";
import { useTranslation } from "@/hooks/use-translation";
import {
  contactProfileHref,
  detectContactKind,
  telHrefForContact,
} from "@/lib/crm/contact-identity";
import { beginPendingCall, readPendingCall } from "@/lib/crm/pending-call";
import {
  isPendingCallPersisted,
  settleDisplacedPendingCall,
} from "@/lib/crm/persist-pending-call";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { emitCrmUpdated } from "@/lib/events";
import { nativePlatform } from "@/lib/native/platform";
import { cn } from "@/lib/utils";
import type { CrmContactKind } from "@/types/crm";

interface CrmPhoneActionsProps {
  phone: string;
  phoneNormalized?: string | null;
  leadId?: string;
  leadName?: string;
  className?: string;
}

function profileIcon(kind: CrmContactKind) {
  if (kind === "whatsapp") return <MessageCircle aria-hidden />;
  if (kind === "telegram") return <Send aria-hidden />;
  return <ExternalLink aria-hidden />;
}

/** Clickable contact that opens Call / platform profile choices. */
export function CrmPhoneActions({
  phone,
  phoneNormalized,
  leadId,
  leadName,
  className,
}: CrmPhoneActionsProps) {
  const { t } = useTranslation();
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const trimmed = phone.trim();
  const kind = detectContactKind(trimmed, phoneNormalized);
  const callUrl = telHrefForContact(trimmed, phoneNormalized);
  const profileUrl = contactProfileHref(trimmed, phoneNormalized);
  const label = displayCrmPhone(trimmed, phoneNormalized);
  const isPhone = kind === "phone";

  if (!trimmed) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  if (!callUrl && !profileUrl) {
    return (
      <span className={cn(isPhone && "font-mono tabular-nums", className)}>
        <LtrNum>{label}</LtrNum>
      </span>
    );
  }

  function onDial() {
    if (!leadId) return;
    const previous = readPendingCall();
    if (previous?.externalCallId) {
      void settleDisplacedPendingCall(previous).then((res) => {
        if (res && isPendingCallPersisted(res)) emitCrmUpdated();
      });
    }
    beginPendingCall({
      leadId,
      leadName: leadName?.trim() || label,
      phone: trimmed,
      source: nativePlatform(),
    });
  }

  const openWhatsapp = kind === "phone" || kind === "whatsapp";

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center whitespace-nowrap text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isPhone && "font-mono tabular-nums",
            className
          )}
          aria-label={t("crm.leads.phoneActions")}
          title={trimmed}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <LtrNum>{label}</LtrNum>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[10rem]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {callUrl ? (
          <DropdownMenuItem asChild>
            <a href={callUrl} className="cursor-pointer" onClick={onDial}>
              <Phone aria-hidden />
              {t("crm.nextAction.call")}
            </a>
          </DropdownMenuItem>
        ) : null}
        {profileUrl && openWhatsapp ? (
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
        {profileUrl && !openWhatsapp ? (
          <DropdownMenuItem asChild>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              {profileIcon(kind)}
              {t("crm.leads.openProfile")}
            </a>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
    {openWhatsapp ? (
      <CrmWhatsappSendDialog
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        targetPhone={trimmed}
        targetHref={profileUrl ?? ""}
        leadId={leadId}
        leadName={leadName}
      />
    ) : null}
    </>
  );
}
