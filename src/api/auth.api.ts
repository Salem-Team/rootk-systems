import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { PermissionId } from "@/constants/permissions";
import type { ApiResponse, AppUser, UserRole } from "@/types";

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthImpersonationInfo {
  active: boolean;
  impersonatorId: string;
  impersonatorEmail: string;
  impersonatorName: string;
}

export interface AuthSessionPayload {
  user: AppUser;
  role: UserRole;
  tokens: AuthTokens;
  permissions?: PermissionId[];
  impersonation?: AuthImpersonationInfo | null;
}

/** POST /auth/login */
export function loginWithCredentials(input: {
  email: string;
  password: string;
}): Promise<ApiResponse<AuthSessionPayload>> {
  return api.post(
    API_ROUTES.auth.login,
    input,
    emptySession(),
    { skipAuth: true }
  );
}

/** POST /auth/impersonate */
export function startImpersonationRemote(input: {
  userId: string;
}): Promise<ApiResponse<AuthSessionPayload>> {
  return api.post(API_ROUTES.auth.impersonate, input, emptySession());
}

/** POST /auth/stop-impersonate */
export function stopImpersonationRemote(): Promise<
  ApiResponse<AuthSessionPayload>
> {
  return api.post(API_ROUTES.auth.stopImpersonate, {}, emptySession());
}

/** POST /auth/change-password */
export function changePasswordRemote(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<boolean>> {
  return api.post(API_ROUTES.auth.changePassword, input, false);
}

/** POST /auth/refresh */
export function refreshSession(
  refreshToken: string
): Promise<ApiResponse<AuthTokens>> {
  return api.post(
    API_ROUTES.auth.refresh,
    { refreshToken },
    { accessToken: "" },
    { skipAuth: true }
  );
}

/** POST /auth/logout */
export function logoutRemote(
  refreshToken?: string | null
): Promise<ApiResponse<boolean>> {
  return api.post(
    API_ROUTES.auth.logout,
    refreshToken ? { refreshToken } : {},
    false
  );
}

export type MePayload = AppUser & {
  permissions?: PermissionId[];
  impersonation?: AuthImpersonationInfo | null;
};

/** GET /auth/me */
export function fetchMe(): Promise<ApiResponse<MePayload | null>> {
  return api.get(API_ROUTES.auth.me, null);
}

export interface ProfileUpdatePayload {
  user: AppUser;
  phone: string;
}

/** POST /auth/profile */
export function updateMyProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<ApiResponse<ProfileUpdatePayload>> {
  return api.post(API_ROUTES.auth.profile, input, {
    user: emptySession().user,
    phone: "",
  });
}

function emptySession(): AuthSessionPayload {
  return {
    user: {
      id: "",
      employeeId: "",
      email: "",
      role: "employee",
      initials: "",
      nameKey: "",
      firstNameKey: "",
      isActive: false,
      companyId: "",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
      updatedBy: "",
      deletedAt: null,
      isArchived: false,
      version: 0,
      metadata: {},
    },
    role: "employee",
    tokens: { accessToken: "" },
    impersonation: null,
  };
}
