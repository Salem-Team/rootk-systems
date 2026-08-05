import type { UserPreferences } from "@/types/preferences";
import type { SeedOf } from "@/types/seed";

/** Seed personal prefs for demo principals (do not share CompanySettings). */
export const userPreferencesSeed: SeedOf<UserPreferences>[] = [
  {
    id: "pref-emp-001",
    userId: "emp-001",
    language: "ar",
    appearance: "light",
    notifications: {
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
    },
  },
  {
    id: "pref-emp-003",
    userId: "emp-003",
    language: "ar",
    appearance: "light",
    notifications: {
      email: true,
      push: true,
      sound: true,
      attendanceReminders: true,
      leaveUpdates: true,
      announcements: false,
      system: true,
      work: true,
      payroll: true,
      schedule: true,
      mention: true,
    },
  },
];
