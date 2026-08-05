import { DEFAULT_COMPANY_NOTIFICATIONS } from "@/lib/notification-policy";
import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { ApiResponse, CompanySettings } from "@/types";

const EMPTY_SETTINGS: CompanySettings = {
  id: "",
  name: "",
  legalName: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  timezone: "",
  currency: "",
  language: "en",
  appearance: "system",
  notifications: { ...DEFAULT_COMPANY_NOTIFICATIONS },
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

/** GET /settings */
export function fetchSettings(): Promise<ApiResponse<CompanySettings>> {
  return api.get(API_ROUTES.settings.root, EMPTY_SETTINGS);
}

/** PATCH /settings */
export function patchSettings(
  patch: Partial<
    Omit<CompanySettings, "notifications"> & {
      notifications?: Partial<CompanySettings["notifications"]>;
    }
  >
): Promise<ApiResponse<CompanySettings>> {
  return api.patch(API_ROUTES.settings.root, patch, EMPTY_SETTINGS);
}
