import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { ApiResponse, DailyPlan, DailyReport } from "@/types";
import type { SaveDailyPlanDto } from "@/schemas/daily-plan.schema";

const emptyPlan: DailyPlan = {
  id: "",
  title: "Daily Plan",
  slots: [],
  companyId: "",
  createdAt: "",
  updatedAt: "",
  createdBy: "",
  updatedBy: "",
  deletedAt: null,
  isArchived: false,
  version: 0,
  metadata: {},
};

export function fetchDailyPlan(): Promise<ApiResponse<DailyPlan>> {
  return api.get(API_ROUTES.dailyPlan.root, emptyPlan);
}

export function putDailyPlan(
  input: SaveDailyPlanDto
): Promise<ApiResponse<DailyPlan>> {
  return api.put(API_ROUTES.dailyPlan.root, input, emptyPlan);
}

const emptyReport: DailyReport = { date: "", rows: [] };

export function fetchDailyReport(
  date: string
): Promise<ApiResponse<DailyReport>> {
  const path = `${API_ROUTES.dailyPlan.report}?date=${encodeURIComponent(date)}`;
  return api.get(path, emptyReport);
}
