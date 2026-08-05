import { isApiMode } from "@/lib/env";
import {
  fetchEmployeePreferenceRows,
  fetchUserPreferences,
  postEnsureUserPreferences,
  postResetAllEmployeeNotifications,
  postResetEmployeeNotifications,
  putUserPreferences,
} from "@/api/preferences.api";
import {
  companyNotificationsDiffer,
  normalizePreferenceNotifications,
  prefsFromCompanyPolicy,
} from "@/lib/preference-notifications";
import { normalizeCompanyNotifications } from "@/lib/notification-policy";
import { userPreferencesRepository } from "@/repositories/user-preferences.repository";
import { settingsRepository } from "@/repositories";
import { employeeRepository } from "@/repositories";
import { usersSeed } from "@/mocks/users";
import { fromError, ok } from "@/services/api-result";
import { simulateDelay } from "@/services/fake-api";
import { getSessionRole } from "@/stores/session-store";
import { ForbiddenError } from "@/lib/errors";
import type { ApiResponse } from "@/types";
import type {
  EmployeePreferenceRow,
  UserPreferences,
} from "@/types/preferences";

async function migrateNotificationsIfNeeded(
  prefs: UserPreferences
): Promise<UserPreferences> {
  const normalized = normalizePreferenceNotifications(prefs.notifications);
  const needsPersist =
    !("sound" in prefs.notifications) ||
    prefs.notifications.sound === undefined ||
    !("work" in prefs.notifications);
  if (!needsPersist) {
    return { ...prefs, notifications: normalized };
  }
  return userPreferencesRepository.upsertForUser(prefs.userId, {
    notifications: normalized,
  });
}

/** GET /users/:id/preferences */
export async function getUserPreferences(
  userId: string
): Promise<ApiResponse<UserPreferences | null>> {
  if (isApiMode()) return fetchUserPreferences(userId);
  try {
    await simulateDelay();
    const prefs = await userPreferencesRepository.getByUserId(userId);
    if (!prefs) return ok(null);
    return ok(await migrateNotificationsIfNeeded(prefs));
  } catch (error) {
    return fromError(error, null);
  }
}

/** PUT /users/:id/preferences */
export async function saveUserPreferences(
  userId: string,
  patch: Partial<
    Pick<UserPreferences, "language" | "appearance"> & {
      notifications?: Partial<UserPreferences["notifications"]>;
    }
  >
): Promise<ApiResponse<UserPreferences | null>> {
  if (isApiMode()) return putUserPreferences(userId, patch);
  try {
    await simulateDelay();
    const saved = await userPreferencesRepository.upsertForUser(userId, patch);
    return ok(saved, "Preferences saved");
  } catch (error) {
    return fromError(error, null);
  }
}

/**
 * Ensure prefs exist for user — seed from company defaults when missing.
 * Does not overwrite company settings.
 */
export async function ensureUserPreferences(
  userId: string
): Promise<ApiResponse<UserPreferences | null>> {
  if (isApiMode()) return postEnsureUserPreferences(userId);
  try {
    await simulateDelay();
    const existing = await userPreferencesRepository.getByUserId(userId);
    if (existing) return ok(await migrateNotificationsIfNeeded(existing));
    const company = await settingsRepository.get();
    const created = await userPreferencesRepository.upsertForUser(userId, {
      language: company.language,
      appearance: company.appearance,
      notifications: normalizePreferenceNotifications({
        ...company.notifications,
        sound: true,
      }),
    });
    return ok(created);
  } catch (error) {
    return fromError(error, null);
  }
}

/** GET /preferences/employees — visibility for HR/admin */
export async function getEmployeePreferenceRows(): Promise<
  ApiResponse<EmployeePreferenceRow[]>
> {
  if (isApiMode()) return fetchEmployeePreferenceRows();
  try {
    await simulateDelay();
    const [prefs, company, employees] = await Promise.all([
      userPreferencesRepository.list(),
      settingsRepository.get(),
      employeeRepository.list(),
    ]);

    const rows: EmployeePreferenceRow[] = usersSeed
      .filter((u) => u.role === "employee")
      .map((u) => {
        const pref = prefs.find((p) => p.userId === u.id);
        const emp = employees.find((e) => e.id === u.id);
        const language = pref?.language ?? company.language;
        const appearance = pref?.appearance ?? company.appearance;
        const differs =
          Boolean(pref) &&
          (language !== company.language ||
            appearance !== company.appearance ||
            companyNotificationsDiffer(pref?.notifications, company.notifications));
        return {
          userId: u.id,
          employeeId: u.employeeId,
          name: emp?.name ?? u.email,
          email: u.email,
          language,
          appearance,
          updatedAt: pref?.updatedAt ?? company.updatedAt,
          differsFromCompany: differs,
        };
      });

    for (const pref of prefs) {
      if (rows.some((r) => r.userId === pref.userId)) continue;
      const emp = employees.find((e) => e.id === pref.userId);
      if (!emp) continue;
      rows.push({
        userId: pref.userId,
        employeeId: emp.id,
        name: emp.name,
        email: emp.email,
        language: pref.language,
        appearance: pref.appearance,
        updatedAt: pref.updatedAt,
        differsFromCompany:
          pref.language !== company.language ||
          pref.appearance !== company.appearance ||
          companyNotificationsDiffer(pref.notifications, company.notifications),
      });
    }

    return ok(rows.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error) {
    return fromError(error, []);
  }
}

/** Admin: reset one employee's notification prefs to company policy. */
export async function resetEmployeeNotificationsToCompany(
  userId: string
): Promise<ApiResponse<UserPreferences | null>> {
  if (isApiMode()) return postResetEmployeeNotifications(userId);
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can reset employee preferences");
    }
    await simulateDelay();
    const company = await settingsRepository.get();
    const policy = normalizeCompanyNotifications(company.notifications);
    const updated = await userPreferencesRepository.upsertForUser(userId, {
      notifications: prefsFromCompanyPolicy(policy),
    });
    return ok(updated, "Employee notifications reset to company policy");
  } catch (error) {
    return fromError(error, null);
  }
}

/** Admin: reset all differing employees to company notification policy. */
export async function resetAllEmployeeNotificationsToCompany(): Promise<
  ApiResponse<{ resetCount: number }>
> {
  if (isApiMode()) return postResetAllEmployeeNotifications();
  try {
    if (getSessionRole() !== "admin") {
      throw new ForbiddenError("Only admins can reset employee preferences");
    }
    await simulateDelay();
    const company = await settingsRepository.get();
    const policy = normalizeCompanyNotifications(company.notifications);
    const target = prefsFromCompanyPolicy(policy);
    const prefs = await userPreferencesRepository.list();
    let resetCount = 0;
    for (const pref of prefs) {
      if (!companyNotificationsDiffer(pref.notifications, company.notifications)) {
        continue;
      }
      await userPreferencesRepository.upsertForUser(pref.userId, {
        notifications: target,
      });
      resetCount += 1;
    }
    return ok({ resetCount }, "Employee notification prefs reset");
  } catch (error) {
    return fromError(error, { resetCount: 0 });
  }
}
