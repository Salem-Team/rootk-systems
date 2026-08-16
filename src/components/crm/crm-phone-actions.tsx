"use client";

import { ExternalLink, MessageCircle, Phone, Send } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/use-translation";
import {
  contactProfileHref,
  detectContactKind,
  telHrefForContact,
} from "@/lib/crm/contact-identity";
import { beginPendingCall } from "@/lib/crm/pending-call";
import { displayCrmPhone } from "@/lib/crm/phone-links";
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
        {label}
      </span>
    );
  }

  function onDial() {
    if (!leadId) return;
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
          {label}
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
