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
  date?: string,
  range?: { from: string; to: string }
): Promise<ApiResponse<DailyReport>> {
  const params = new URLSearchParams();
  if (range?.from && range?.to && range.from !== range.to) {
    params.set("from", range.from);
    params.set("to", range.to);
  } else if (date) {
    params.set("date", date);
  } else if (range?.from) {
    params.set("date", range.from);
  }
  const path = `${API_ROUTES.dailyPlan.report}?${params.toString()}`;
  return api.get(path, emptyReport);
}
