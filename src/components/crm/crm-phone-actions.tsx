"use client";

import { MessageCircle, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/use-translation";
import { telHref, whatsappHref } from "@/lib/crm/phone-links";
import { cn } from "@/lib/utils";

interface CrmPhoneActionsProps {
  phone: string;
  className?: string;
}

/** Clickable phone that opens Call / WhatsApp choices. */
export function CrmPhoneActions({ phone, className }: CrmPhoneActionsProps) {
  const { t } = useTranslation();
  const trimmed = phone.trim();
  const callUrl = trimmed ? telHref(trimmed) : null;
  const whatsappUrl = trimmed ? whatsappHref(trimmed) : null;

  if (!trimmed) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  if (!callUrl && !whatsappUrl) {
    return <span className={cn("font-mono tabular-nums", className)}>{phone}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-full items-center truncate font-mono tabular-nums text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          aria-label={t("crm.leads.phoneActions")}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {phone}
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
            <a href={callUrl} className="cursor-pointer">
              <Phone aria-hidden />
              {t("crm.nextAction.call")}
            </a>
          </DropdownMenuItem>
        ) : null}
        {whatsappUrl ? (
          <DropdownMenuItem asChild>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <MessageCircle aria-hidden />
              {t("crm.nextAction.whatsapp")}
            </a>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
