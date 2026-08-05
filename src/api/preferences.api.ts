import type { SaveUserPreferencesInput } from "@/api/contracts";
import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { ApiResponse } from "@/types";
import type {
  EmployeePreferenceRow,
  UserPreferences,
} from "@/types/preferences";

/** GET /users/:id/preferences */
export function fetchUserPreferences(
  userId: string
): Promise<ApiResponse<UserPreferences | null>> {
  return api.get(API_ROUTES.users.preferences(userId), null);
}

/** PUT /users/:id/preferences */
export function putUserPreferences(
  userId: string,
  patch: SaveUserPreferencesInput
): Promise<ApiResponse<UserPreferences | null>> {
  return api.put(API_ROUTES.users.preferences(userId), patch, null);
}

/** POST /users/:id/preferences/ensure — create defaults if missing */
export function postEnsureUserPreferences(
  userId: string
): Promise<ApiResponse<UserPreferences | null>> {
  return api.post(
    `${API_ROUTES.users.preferences(userId)}/ensure`,
    {},
    null
  );
}

/** GET /preferences/employees — admin visibility */
export function fetchEmployeePreferenceRows(): Promise<
  ApiResponse<EmployeePreferenceRow[]>
> {
  return api.getList(API_ROUTES.preferences.employeeRows);
}

/** POST /preferences/employees/:userId/reset-notifications */
export function postResetEmployeeNotifications(
  userId: string
): Promise<ApiResponse<UserPreferences | null>> {
  return api.post(
    API_ROUTES.preferences.resetEmployeeNotifications(userId),
    {},
    null
  );
}

/** POST /preferences/employees/reset-notifications */
export function postResetAllEmployeeNotifications(): Promise<
  ApiResponse<{ resetCount: number }>
> {
  return api.post(
    API_ROUTES.preferences.resetAllNotifications,
    {},
    { resetCount: 0 }
  );
}
