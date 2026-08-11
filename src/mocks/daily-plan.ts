import { enrichWithAudit } from "@/lib/entity";
import type { DailyPlan, DailyPlanSlot } from "@/types/daily-plan";

const ACTOR = "user-admin";

function slot(
  id: string,
  title: string,
  startTime: string,
  endTime: string,
  sortOrder: number,
  description = ""
): DailyPlanSlot {
  return enrichWithAudit(
    {
      id,
      planId: "dplan-001",
      title,
      description,
      startTime,
      endTime,
      sortOrder,
    },
    ACTOR
  );
}

export const dailyPlanSeed: DailyPlan = enrichWithAudit(
  {
    id: "dplan-001",
    title: "Daily Plan",
    slots: [
      slot("dps-001", "Morning standup", "09:00", "09:30", 0, "Align on today's priorities"),
      slot("dps-002", "Focus work", "09:30", "12:00", 1, "Deep work and assigned tasks"),
      slot("dps-003", "Lunch break", "12:00", "13:00", 2),
      slot("dps-004", "Production", "13:00", "16:30", 3, "Client work, ads, and delivery"),
      slot("dps-005", "Wrap-up", "16:30", "18:00", 4, "Reviews, handoff, and next-day prep"),
    ],
  },
  ACTOR
);
