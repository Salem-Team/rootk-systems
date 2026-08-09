import type { CrmLead, CrmLeadActivity, CrmLeadFeedback, CrmSalesProfile, CrmStage } from "@/types/crm";
import { buildStageCards, isLost, isWon, stageMap } from "@/lib/crm/stage-metrics";

export function buildSalesProfile(
  employeeId: string,
  employeeName: string,
  leads: CrmLead[],
  stages: CrmStage[],
  activities: CrmLeadActivity[],
  feedback: CrmLeadFeedback[]
): CrmSalesProfile {
  const mine = leads.filter((l) => l.ownerEmployeeId === employeeId);
  const map = stageMap(stages);
  const won = mine.filter((l) => isWon(map.get(l.stageId))).length;
  const lost = mine.filter((l) => isLost(map.get(l.stageId))).length;
  const closed = won + lost;
  const pendingFollowUps = mine.filter(
    (l) => l.status === "active" && l.nextFollowUpAt
  ).length;
  const leadIds = new Set(mine.map((l) => l.id));

  return {
    employeeId,
    employeeName,
    overview: {
      totalLeads: mine.length,
      activeLeads: mine.filter((l) => l.status === "active").length,
      won,
      lost,
      conversionRate:
        closed > 0 ? Math.round((won / closed) * 1000) / 10 : 0,
      pendingFollowUps,
    },
    pipeline: buildStageCards(mine, stages, []),
    recentActivities: activities
      .filter((a) => leadIds.has(a.leadId))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 20),
    feedback: feedback
      .filter((f) => leadIds.has(f.leadId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
  };
}
