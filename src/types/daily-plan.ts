import type { BaseEntity } from "@/types";

export interface DailyPlanSlot extends BaseEntity {
  id: string;
  planId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

export interface DailyPlan extends BaseEntity {
  id: string;
  title: string;
  slots: DailyPlanSlot[];
}

export interface DailyPlanSlotInput {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
}
