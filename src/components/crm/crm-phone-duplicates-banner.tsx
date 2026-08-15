"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { getCrmPhoneDuplicates } from "@/services/crm.service";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { Button } from "@/components/ui/button";
import type { CrmPhoneDuplicateGroup } from "@/types/crm";

interface CrmPhoneDuplicatesBannerProps {
  onOpenLead: (leadId: string) => void;
}

/** Reports existing duplicate phones without merging or deleting them. */
export function CrmPhoneDuplicatesBanner({
  onOpenLead,
}: CrmPhoneDuplicatesBannerProps) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<CrmPhoneDuplicateGroup[]>([]);

  useEffect(() => {
    void getCrmPhoneDuplicates().then((res) => {
      if (res.success && Array.isArray(res.data)) setGroups(res.data);
    });
  }, []);

  if (groups.length === 0) return null;
  const first = groups[0];

  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-[13px]">
      <p className="font-medium">{t("crm.duplicate.bannerTitle", { count: groups.length })}</p>
      <p className="mt-0.5 text-muted-foreground">{t("crm.duplicate.bannerDesc")}</p>
      {first ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono tabular-nums">
            {displayCrmPhone(first.leads[0]?.phone ?? "", first.phoneNormalized)}
          </span>
          {first.leads.slice(0, 3).map((lead) => (
            <Button
              key={lead.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenLead(lead.id)}
            >
              {lead.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
