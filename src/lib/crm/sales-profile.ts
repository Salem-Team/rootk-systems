import type {
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmSalesProfile,
  CrmSalesProfileCardKey,
  CrmSalesProfileLead,
  CrmStage,
} from "@/types/crm";
import { buildStageCards, isLost, isWon, stageMap } from "@/lib/crm/stage-metrics";

export function toSalesProfileLeads(
  leads: CrmLead[],
  stages: CrmStage[]
): CrmSalesProfileLead[] {
  const map = stageMap(stages);
  return leads.map((lead) => {
    const stage = map.get(lead.stageId);
    return {
      id: lead.id,
      name: lead.name,
      companyName: lead.companyName,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      stageId: lead.stageId,
      stageName: stage?.name ?? "",
      stageColor: stage?.color ?? "#94a3b8",
      stageCategory: stage?.category ?? "other",
      nextFollowUpAt: lead.nextFollowUpAt,
      ownerEmployeeId: lead.ownerEmployeeId,
    };
  });
}

export function ownedSalesProfileLeads(
  leads: CrmSalesProfileLead[],
  employeeId: string
): CrmSalesProfileLead[] {
  const ownerId = employeeId.trim();
  if (!ownerId) return [];
  return leads.filter((lead) => lead.ownerEmployeeId === ownerId);
}

export function mergeOwnedProfileLeads(
  profile: CrmSalesProfile,
  fallbackLeads: CrmLead[],
  stages: CrmStage[]
): CrmSalesProfile {
  const fromProfile = ownedSalesProfileLeads(
    profile.leads ?? [],
    profile.employeeId
  );
  if (fromProfile.length) return { ...profile, leads: fromProfile };
  const ownedFallback = fallbackLeads.filter(
    (lead) => lead.ownerEmployeeId === profile.employeeId
  );
  return {
    ...profile,
    leads: toSalesProfileLeads(ownedFallback, stages),
  };
}

export function filterSalesProfileLeads(
  leads: CrmSalesProfileLead[],
  key: CrmSalesProfileCardKey,
  stageId?: string
): CrmSalesProfileLead[] {
  if (key === "total") return leads;
  if (key === "active") return leads.filter((l) => l.status === "active");
  if (key === "won") return leads.filter((l) => l.stageCategory === "won");
  if (key === "lost") return leads.filter((l) => l.stageCategory === "lost");
  if (key === "conversion") {
    return leads.filter(
      (l) => l.stageCategory === "won" || l.stageCategory === "lost"
    );
  }
  if (key === "pendingFollowUps") {
    return leads.filter((l) => l.status === "active" && Boolean(l.nextFollowUpAt));
  }
  if (key === "stage") {
    return stageId ? leads.filter((l) => l.stageId === stageId) : [];
  }
  return leads;
}

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
  const profileLeads = toSalesProfileLeads(mine, stages);
  const won = mine.filter((l) => isWon(map.get(l.stageId))).length;
  const lost = mine.filter((l) => isLost(map.get(l.stageId))).length;
  const closed = won + lost;
  const leadIds = new Set(mine.map((l) => l.id));

  return {
    employeeId,
    employeeName,
    overview: {
      totalLeads: mine.length,
      activeLeads: filterSalesProfileLeads(profileLeads, "active").length,
      won,
      lost,
      conversionRate:
        closed > 0 ? Math.round((won / closed) * 1000) / 10 : 0,
      pendingFollowUps: filterSalesProfileLeads(
        profileLeads,
        "pendingFollowUps"
      ).length,
    },
    pipeline: buildStageCards(mine, stages, []),
    leads: profileLeads,
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
