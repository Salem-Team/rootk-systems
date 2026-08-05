import { api } from "@/api/http";
import { API_ROUTES } from "@/api/routes";
import type { ApiResponse } from "@/types";

/** POST /demo/reset — backend-only in api mode (may 404 if not exposed) */
export function postDemoReset(): Promise<ApiResponse<boolean>> {
  return api.post(API_ROUTES.demo.reset, {}, false);
}

/** POST /demo/generate */
export function postDemoGenerate(): Promise<ApiResponse<boolean>> {
  return api.post(API_ROUTES.demo.generate, {}, false);
}

/** DELETE /demo */
export function deleteDemoData(): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.demo.clear, false);
}
