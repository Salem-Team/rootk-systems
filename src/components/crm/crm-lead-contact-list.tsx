"use client";

import { MessageCircle } from "lucide-react";
import { CrmPhoneActions } from "@/components/crm/crm-phone-actions";
import { detectContactKind } from "@/lib/crm/contact-identity";
import {
  allLeadContacts,
  type LeadContactRecord,
} from "@/lib/crm/lead-contacts";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/types/crm";

/** Table/card cell: phone if the lead has one, otherwise the WhatsApp username. */
function compactContact(rows: LeadContactRecord[]): LeadContactRecord | null {
  const phone = rows.find(
    (row) => detectContactKind(row.phone, row.phoneNormalized) === "phone"
  );
  if (phone) return phone;
  const whatsapp = rows.find(
    (row) => detectContactKind(row.phone, row.phoneNormalized) === "whatsapp"
  );
  return whatsapp ?? rows[0] ?? null;
}

interface CrmLeadContactListProps {
  lead: Pick<
    CrmLead,
    "id" | "name" | "phone" | "phoneNormalized" | "contactKind" | "contacts"
  >;
  className?: string;
  compact?: boolean;
}

/** Renders every saved phone / username for a lead. */
export function CrmLeadContactList({
  lead,
  className,
  compact = false,
}: CrmLeadContactListProps) {
  const rows = allLeadContacts(
    lead.phone,
    lead.phoneNormalized,
    lead.contacts,
    lead.contactKind
  );
  if (rows.length === 0) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  const picked = compact ? compactContact(rows) : null;
  const visible = compact ? (picked ? [picked] : []) : rows;
  const extra = compact ? Math.max(0, rows.length - visible.length) : 0;

  return (
    <div className={cn("grid gap-0.5", className)}>
      {visible.map((row) => {
        const kind = detectContactKind(row.phone, row.phoneNormalized);
        return (
        <span
          key={`${row.kind}:${row.phoneNormalized || row.phone}:${row.label ?? ""}`}
          className="inline-flex min-w-0 items-center gap-x-1.5"
        >
          {!compact && row.label ? (
            <span className="text-foreground/80">{row.label}</span>
          ) : null}
          {compact && kind === "whatsapp" ? (
            <MessageCircle
              className="h-3.5 w-3.5 shrink-0 text-emerald-600"
              aria-hidden
            />
          ) : null}
          <CrmPhoneActions
            phone={row.phone}
            phoneNormalized={row.phoneNormalized}
            leadId={lead.id}
            leadName={lead.name}
            className="text-[12px]"
          />
        </span>
        );
      })}
      {extra > 0 ? (
        <span className="text-[11px] text-muted-foreground">+{extra}</span>
      ) : null}
    </div>
  );
}
