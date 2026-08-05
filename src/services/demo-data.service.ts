import {
  deleteDemoData,
  postDemoGenerate,
  postDemoReset,
} from "@/api/demo.api";
import { isApiMode, isLocalMode } from "@/lib/env";
import {
  clearDemoData,
  generateSampleData,
  resetDemoData,
} from "@/storage/bootstrap";
import { fail, fromError, ok } from "@/services/api-result";
import { resetPayrollMemory } from "@/services/payroll.service";
import type { ApiResponse } from "@/types";

/** POST /demo/reset — wipe + reseed professional sample data */
export async function resetDemoDataset(): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return postDemoReset();
  try {
    await resetDemoData();
    resetPayrollMemory();
    return ok(true, "Demo data reset successfully");
  } catch (error) {
    return fromError(error, false);
  }
}

/** POST /demo/generate — regenerate sample dataset */
export async function generateDemoDataset(): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return postDemoGenerate();
  try {
    await generateSampleData();
    resetPayrollMemory();
    return ok(true, "Sample data generated successfully");
  } catch (error) {
    return fromError(error, false);
  }
}

/** DELETE /demo — clear namespaced local dataset */
export async function clearDemoDataset(): Promise<ApiResponse<boolean>> {
  if (isApiMode()) return deleteDemoData();
  if (!isLocalMode()) {
    return fail(false, "Demo clear is only available in local mode", "FORBIDDEN");
  }
  try {
    await clearDemoData();
    resetPayrollMemory();
    return ok(true, "Demo data cleared");
  } catch (error) {
    return fromError(error, false);
  }
}
