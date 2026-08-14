"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { useTranslation } from "@/hooks/use-translation";
import { formatIsoDateTime } from "@/lib/format-time";
import { ensureCrmList } from "@/lib/crm-normalize";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { CrmLead, CrmLeadActivity } from "@/types/crm";

interface CrmActivitiesPanelProps {
  activities: CrmLeadActivity[];
  leads: CrmLead[];
  employees: Employee[];
  loading?: boolean;
  onLeadClick?: (leadId: string) => void;
  className?: string;
}

function formatWhen(iso: string): string {
  return formatIsoDateTime(iso, "en", "d MMM yyyy · h:mm a");
}

/** Recent CRM activities feed. */
export function CrmActivitiesPanel({
  activities: activitiesProp,
  leads: leadsProp,
  employees: employeesProp,
  loading = false,
  onLeadClick,
  className,
}: CrmActivitiesPanelProps) {
  const { t } = useTranslation();
  const activities = ensureCrmList<CrmLeadActivity>(activitiesProp);
  const leads = ensureCrmList<CrmLead>(leadsProp);
  const employees = ensureCrmList<Employee>(employeesProp);
  const leadMap = useMemo(
    () => new Map(leads.map((l) => [l.id, l])),
    [leads]
  );
  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees]
  );

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <section className={cn("surface-panel", className)}>
      <div className="panel-header">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("crm.activities.title")}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("crm.activities.description")}
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={t("crm.empty.activities")}
            description={t("crm.empty.activitiesDesc")}
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {activities.map((item) => {
            const lead = leadMap.get(item.leadId);
            const actor = item.actorEmployeeId
              ? employeeMap.get(item.actorEmployeeId)
              : null;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!onLeadClick}
                  onClick={() => onLeadClick?.(item.leadId)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-3 text-start sm:px-4",
                    onLeadClick
                      ? "transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      : "cursor-default"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-semibold">{item.title}</p>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatWhen(item.occurredAt)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="text-[12px] text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground/80">
                    {actor ? (
                      <>
                        {t("crm.activities.by")} {actor}
                        {" · "}
                      </>
                    ) : null}
                    {lead ? (
                      <>
                        {t("crm.activities.onLead")} {lead.name}
                      </>
                    ) : (
                      item.type
                    )}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
