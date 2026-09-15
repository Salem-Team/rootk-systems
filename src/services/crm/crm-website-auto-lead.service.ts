import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import { emitCrmUpdated } from "@/lib/events";
import { isApiMode } from "@/lib/env";
import type { ApiResponse } from "@/types";

export type WebsiteAutoLeadConfig = {
  enabled: boolean;
  employeeIds: string[];
  nextIndex: number;
  effectiveFrom: string;
};

const EMPTY: WebsiteAutoLeadConfig = {
  enabled: true,
  employeeIds: [],
  nextIndex: 0,
  effectiveFrom: "2026-09-13",
};

export async function getWebsiteAutoLead(): Promise<
  ApiResponse<WebsiteAutoLeadConfig>
> {
  if (!isApiMode()) return { success: true, data: EMPTY };
  return api.get<WebsiteAutoLeadConfig>(
    API_ROUTES.crm.websiteAutoLead,
    EMPTY
  );
}

export async function updateWebsiteAutoLead(input: {
  enabled?: boolean;
  employeeIds?: string[];
  effectiveFrom?: string;
}): Promise<ApiResponse<WebsiteAutoLeadConfig>> {
  if (!isApiMode()) {
    emitCrmUpdated();
    return {
      success: true,
      data: {
        ...EMPTY,
        ...input,
        employeeIds: input.employeeIds ?? EMPTY.employeeIds,
      },
    };
  }
  const res = await api.put<WebsiteAutoLeadConfig>(
    API_ROUTES.crm.websiteAutoLead,
    input,
    EMPTY
  );
  if (res.success) emitCrmUpdated();
  return res;
}
