"use client";

import { useMemo } from "react";
import { CrmPhoneActions } from "@/components/crm/crm-phone-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { useTranslation } from "@/hooks/use-translation";
import { ensureCrmList } from "@/lib/crm-normalize";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import type { CrmLead, CrmStage } from "@/types/crm";

interface CrmPipelinePanelProps {
  stages: CrmStage[];
  leads: CrmLead[];
  employees: Employee[];
  loading?: boolean;
  onLeadClick: (lead: CrmLead) => void;
  className?: string;
}

/** Compact kanban columns by active stage (click lead → sheet). */
export function CrmPipelinePanel({
  stages: stagesProp,
  leads: leadsProp,
  employees: employeesProp,
  loading = false,
  onLeadClick,
  className,
}: CrmPipelinePanelProps) {
  const { t } = useTranslation();
  const stages = ensureCrmList<CrmStage>(stagesProp);
  const leads = ensureCrmList<CrmLead>(leadsProp);
  const employees = ensureCrmList<Employee>(employeesProp);
  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees]
  );

  const activeStages = useMemo(
    () =>
      [...stages]
        .filter((s) => s.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [stages]
  );

  const byStage = useMemo(() => {
    const map = new Map<string, CrmLead[]>();
    for (const stage of activeStages) map.set(stage.id, []);
    for (const lead of leads) {
      if (lead.status === "archived") continue;
      const list = map.get(lead.stageId);
      if (list) list.push(lead);
    }
    return map;
  }, [activeStages, leads]);

  const total = useMemo(
    () =>
      activeStages.reduce(
        (sum, s) => sum + (byStage.get(s.id)?.length ?? 0),
        0
      ),
    [activeStages, byStage]
  );

  if (loading) return <TableSkeleton rows={4} />;

  if (activeStages.length === 0) {
    return (
      <EmptyState
        title={t("crm.empty.stages")}
        description={t("crm.empty.stagesDesc")}
      />
    );
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">
          {t("crm.pipeline.title")}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("crm.pipeline.description")}
        </p>
      </div>

      <div className="grid gap-3 md:hidden">
        {activeStages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const pct = total > 0 ? Math.round((items.length / total) * 100) : 0;
          return (
            <div key={stage.id} className="surface-panel overflow-hidden">
              <div className="border-b border-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                    aria-hidden
                  />
                  <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {stage.name}
                  </h3>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {items.length} · {pct}%
                  </span>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 p-2">
                {items.length === 0 ? (
                  <li className="px-2 py-4 text-center text-[12px] text-muted-foreground">
                    {t("crm.empty.pipeline")}
                  </li>
                ) : (
                  items.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => onLeadClick(lead)}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <p className="truncate text-[13px] font-semibold">
                          {lead.name}
                        </p>
                        <div
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <CrmPhoneActions
                            phone={lead.phone}
                            className="text-[11px]"
                          />
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {lead.ownerEmployeeId
                            ? (employeeMap.get(lead.ownerEmployeeId) ??
                              t("crm.leads.unassigned"))
                            : t("crm.leads.unassigned")}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="hidden scroll-x gap-3 pb-2 md:flex [scrollbar-width:thin]">
        {activeStages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const pct = total > 0 ? Math.round((items.length / total) * 100) : 0;
          return (
            <div
              key={stage.id}
              className="surface-panel flex w-[min(260px,78vw)] shrink-0 flex-col overflow-hidden"
            >
              <div className="border-b border-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                    aria-hidden
                  />
                  <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {stage.name}
                  </h3>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {pct}% {t("crm.pipeline.ofPipeline")}
                </p>
              </div>

              <ul className="scroll-y flex max-h-[min(60vh,520px)] flex-col gap-1.5 p-2">
                {items.length === 0 ? (
                  <li className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                    {t("crm.empty.pipeline")}
                  </li>
                ) : (
                  items.map((lead) => (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => onLeadClick(lead)}
                        className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <p className="truncate text-[13px] font-semibold">
                          {lead.name}
                        </p>
                        <div
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <CrmPhoneActions
                            phone={lead.phone}
                            className="text-[11px]"
                          />
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {lead.ownerEmployeeId
                            ? (employeeMap.get(lead.ownerEmployeeId) ??
                              t("crm.leads.unassigned"))
                            : t("crm.leads.unassigned")}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
