import type { CompanySettings } from "@/types";
import type { SeedOf } from "@/types/seed";

/** Raw seed — Egypt market defaults. */
export const companySettingsSeed: Omit<SeedOf<CompanySettings>, "id"> & {
  id?: string;
} = {
  id: "settings_rootk_001",
  name: "ROOTK",
  legalName: "ROOTK Systems شركة روتك للأنظمة",
  email: "hr@rootk.systems",
  phone: "+20 2 2770 4400",
  address:
    "شارع التسعين الشمالي، التجمع الخامس، القاهرة الجديدة، جمهورية مصر العربية",
  website: "https://rootk.systems",
  timezone: "Africa/Cairo",
  currency: "EGP",
  language: "ar",
  appearance: "system",
  notifications: {
    inApp: true,
    email: true,
    push: true,
    sound: true,
    attendanceReminders: true,
    leaveUpdates: true,
    announcements: true,
    system: true,
    work: true,
    payroll: true,
    schedule: true,
    mention: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    quietAllowUrgent: true,
    retentionDays: 90,
  },
};
