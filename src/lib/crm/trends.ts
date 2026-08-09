import { eachDayOfInterval, endOfDay, format, isAfter, isSameDay, startOfDay, subDays } from "date-fns";
import type { CrmLead, CrmStage, CrmTrendPoint } from "@/types/crm";
import { parseMaybe } from "@/lib/crm/date-range";
import { isLost, isWon, stageMap } from "@/lib/crm/stage-metrics";

export function buildLeadsTrend(leads: CrmLead[], from: Date | null, to: Date): CrmTrendPoint[] {
  const start = from ?? startOfDay(subDays(to, 29));
  const days = eachDayOfInterval({ start, end: to });
  return days.map((day) => ({
    date: format(day, "yyyy-MM-dd"),
    value: leads.filter((l) => {
      const c = parseMaybe(l.createdAt);
      return c ? isSameDay(c, day) : false;
    }).length,
  }));
}

export function buildConversionTrend(
  leads: CrmLead[],
  stages: CrmStage[],
  from: Date | null,
  to: Date
): CrmTrendPoint[] {
  const map = stageMap(stages);
  const start = from ?? startOfDay(subDays(to, 29));
  const days = eachDayOfInterval({ start, end: to });
  return days.map((day) => {
    const upTo = leads.filter((l) => {
      const c = parseMaybe(l.createdAt);
      return c ? !isAfter(c, endOfDay(day)) : false;
    });
    const won = upTo.filter((l) => isWon(map.get(l.stageId))).length;
    const lost = upTo.filter((l) => isLost(map.get(l.stageId))).length;
    const closed = won + lost;
    return {
      date: format(day, "yyyy-MM-dd"),
      value: closed > 0 ? Math.round((won / closed) * 1000) / 10 : 0,
    };
  });
}
