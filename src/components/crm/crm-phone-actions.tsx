"use client";

import { ExternalLink, MessageCircle, Phone, Send } from "lucide-react";
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
import { persistPendingCrmCall } from "@/lib/crm/persist-pending-call";
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
    // Flush any previous dial so it still counts in user performance.
    const previous = readPendingCall();
    if (previous && previous.externalCallId) {
      void persistPendingCrmCall(previous, { status: "unknown" }).then((res) => {
        if (res.success) emitCrmUpdated();
      });
    }
    beginPendingCall({
      leadId,
      leadName: leadName?.trim() || label,
      phone: trimmed,
      source: nativePlatform(),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-full items-center truncate text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isPhone && "font-mono tabular-nums",
            className
          )}
          aria-label={t("crm.leads.phoneActions")}
          title={trimmed}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <LtrNum className="min-w-0 truncate">{label}</LtrNum>
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
        {profileUrl ? (
          <DropdownMenuItem asChild>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              {profileIcon(kind)}
              {kind === "phone" || kind === "whatsapp"
                ? t("crm.nextAction.whatsapp")
                : t("crm.leads.openProfile")}
            </a>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
