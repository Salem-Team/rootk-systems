import type { CrmKpis, CrmLead, CrmStage, CrmStageCard } from "@/types/crm";

export function stageMap(stages: CrmStage[]): Map<string, CrmStage> {
  return new Map(stages.map((s) => [s.id, s]));
}

export function isWon(stage: CrmStage | undefined): boolean {
  return stage?.category === "won";
}

export function isLost(stage: CrmStage | undefined): boolean {
  return stage?.category === "lost";
}

/** Lost clients stay on the Lost stage. They are not part of "total clients". */
export function countsTowardClientTotal(stage: CrmStage | undefined): boolean {
  return !isLost(stage);
}

export function countClientsInTotal(
  leads: CrmLead[],
  stages: CrmStage[]
): number {
  const map = stageMap(stages);
  return leads.filter((lead) =>
    countsTowardClientTotal(map.get(lead.stageId))
  ).length;
}

export function trendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildStageCards(
  leads: CrmLead[],
  stages: CrmStage[],
  prevLeads: CrmLead[]
): CrmStageCard[] {
  const activeStages = [...stages]
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const total = leads.length || 1;
  return activeStages.map((stage) => {
    const count = leads.filter((l) => l.stageId === stage.id).length;
    const prev = prevLeads.filter((l) => l.stageId === stage.id).length;
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      category: stage.category,
      count,
      percent: Math.round((count / total) * 100),
      trendPercent: trendPercent(count, prev),
    };
  });
}

export function buildKpis(
  leads: CrmLead[],
  stages: CrmStage[],
  rangeLeads: CrmLead[]
): CrmKpis {
  const map = stageMap(stages);
  const converted = leads.filter((l) => isWon(map.get(l.stageId))).length;
  const closed =
    converted + leads.filter((l) => isLost(map.get(l.stageId))).length;
  return {
    totalLeads: countClientsInTotal(leads, stages),
    newLeads: rangeLeads.length,
    activeLeads: leads.filter((l) => l.status === "active").length,
    converted,
    conversionRate:
      closed > 0 ? Math.round((converted / closed) * 1000) / 10 : 0,
  };
}
