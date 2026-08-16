"use client";

import { CrmPhoneActions } from "@/components/crm/crm-phone-actions";
import { allLeadContacts } from "@/lib/crm/lead-contacts";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/types/crm";

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

  const visible = compact ? rows.slice(0, 1) : rows;
  const extra = compact ? rows.length - 1 : 0;

  return (
    <div className={cn("grid gap-0.5", className)}>
      {visible.map((row) => (
        <CrmPhoneActions
          key={`${row.kind}:${row.phoneNormalized || row.phone}`}
          phone={row.phone}
          phoneNormalized={row.phoneNormalized}
          leadId={lead.id}
          leadName={lead.name}
          className="text-[12px]"
        />
      ))}
      {extra > 0 ? (
        <span className="text-[11px] text-muted-foreground">+{extra}</span>
      ) : null}
    </div>
  );
}
