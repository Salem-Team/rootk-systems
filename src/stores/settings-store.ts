import { DEFAULT_COMPANY_NOTIFICATIONS } from "@/lib/notification-policy";
import { create } from "zustand";
import { getSettings, updateSettings } from "@/services/settings.service";
import type { TranslationPath } from "@/i18n";
import type { CompanySettings } from "@/types";

const EMPTY_SETTINGS: CompanySettings = {
  id: "",
  name: "ROOTK",
  legalName: "ROOTK Systems Co.",
  email: "hr@rootk.systems",
  phone: "",
  address: "",
  website: "",
  timezone: "Africa/Cairo",
  currency: "EGP",
  language: "ar",
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

interface SettingsState {
  settings: CompanySettings;
  isLoading: boolean;
  isSaving: boolean;
  error: TranslationPath | null;
  fetchSettings: () => Promise<void>;
  saveSettings: (
    patch: Partial<
      Omit<CompanySettings, "notifications"> & {
        notifications?: Partial<CompanySettings["notifications"]>;
      }
    >
  ) => Promise<boolean>;
  setLocalSettings: (settings: CompanySettings) => void;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...EMPTY_SETTINGS, notifications: { ...EMPTY_SETTINGS.notifications } },
  isLoading: false,
  isSaving: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await getSettings();
      if (!res.success) {
        set({ error: "errors.loadSettings", isLoading: false });
        return;
      }
      set({ settings: res.data, isLoading: false });
    } catch {
      set({ error: "errors.loadSettings", isLoading: false });
    }
  },

  saveSettings: async (patch) => {
    set({ isSaving: true, error: null });
    try {
      const res = await updateSettings(patch);
      if (!res.success) {
        set({ error: "errors.saveSettings", isSaving: false });
        return false;
      }
      set({ settings: res.data, isSaving: false });
      return true;
    } catch {
      set({ error: "errors.saveSettings", isSaving: false });
      return false;
    }
  },

  setLocalSettings: (settings) => set({ settings }),
  clearError: () => set({ error: null }),
}));
