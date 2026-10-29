import { fetchSettings, patchSettings } from "@/api/settings.api";
import { isApiMode } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import {
  DEFAULT_COMPANY_NOTIFICATIONS,
  withNormalizedSettingsNotifications,
} from "@/lib/notification-policy";
import {
  accountsOnCompany,
  parseWhatsappAccountsInput,
  withWhatsappAccounts,
} from "@/lib/whatsapp-accounts";
import { settingsRepository } from "@/repositories";
import { updateSettingsSchema } from "@/schemas";
import { fromError, ok } from "@/services/api-result";
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

function withCompanyWhatsapp(settings: CompanySettings): CompanySettings {
  return {
    ...settings,
    whatsappAccounts: accountsOnCompany(settings),
  };
}

/** GET /settings */
export async function getSettings(): Promise<ApiResponse<CompanySettings>> {
  if (isApiMode()) return fetchSettings();
  try {
    const raw = await settingsRepository.get();
    return ok(withCompanyWhatsapp(withNormalizedSettingsNotifications(raw)));
  } catch (error) {
    return fromError(error, EMPTY_SETTINGS);
  }
}

/** PATCH /settings */
export async function updateSettings(
  patch: Partial<
    Omit<CompanySettings, "notifications"> & {
      notifications?: Partial<CompanySettings["notifications"]>;
    }
  >
): Promise<ApiResponse<CompanySettings>> {
  if (isApiMode()) return patchSettings(patch);
  try {
    const parsed = updateSettingsSchema.safeParse(patch);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid settings payload",
        parsed.error.flatten()
      );
    }
    const data = { ...parsed.data } as typeof parsed.data & {
      whatsappAccounts?: CompanySettings["whatsappAccounts"];
      metadata?: CompanySettings["metadata"];
    };
    if (data.whatsappAccounts !== undefined) {
      const wa = parseWhatsappAccountsInput({ accounts: data.whatsappAccounts });
      if (!wa.ok) {
        throw new ValidationError("Invalid company WhatsApp accounts");
      }
      const current = await settingsRepository.get();
      data.whatsappAccounts = wa.accounts;
      data.metadata = withWhatsappAccounts(current.metadata, wa.accounts);
    }
    const updated = await settingsRepository.update(data);
    const normalized = withCompanyWhatsapp(
      withNormalizedSettingsNotifications(updated)
    );
    // Propagate company currency into payroll policies (same source of truth).
    if (parsed.data.currency) {
      const { updatePayrollPolicies } = await import("@/services/payroll.service");
      await updatePayrollPolicies({ currency: parsed.data.currency });
    }
    return ok(normalized, "Settings updated successfully");
  } catch (error) {
    return fromError(
      error,
      await settingsRepository
        .get()
        .then(withNormalizedSettingsNotifications)
        .then(withCompanyWhatsapp)
        .catch(() => EMPTY_SETTINGS)
    );
  }
}

/** PATCH /settings/notifications */
export async function updateNotifications(
  notifications: Partial<CompanySettings["notifications"]>
): Promise<ApiResponse<CompanySettings>> {
  return updateSettings({ notifications });
}
