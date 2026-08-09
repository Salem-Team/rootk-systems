import { isApiMode } from "@/lib/env";
import { fetchWorkMeetings } from "@/api/work.api";
import { workMeetingRepository } from "@/repositories/work.repository";
import { fromError, ok } from "@/services/api-result";
import { getWorkEmployeeId } from "@/stores/session-store";
import { AppRole } from "@/constants/roles";
import { actorContext } from "@/services/work/work-shared";
import type { ApiResponse } from "@/types";
import type { WorkMeeting } from "@/types/work";

/** GET /work/meetings */
export async function getWorkMeetings(filters: {
  employeeId?: string;
  date?: string;
} = {}): Promise<ApiResponse<WorkMeeting[]>> {
  const { role, employeeId: selfId } = actorContext();
  const scoped =
    role === AppRole.employee
      ? { ...filters, employeeId: selfId }
      : filters;
  if (isApiMode()) return fetchWorkMeetings(scoped);
  try {
    return ok(await workMeetingRepository.filter(scoped));
  } catch (error) {
    return fromError(error, []);
  }
}

/** GET /work/meetings?mine=1 */
export async function getMyWorkMeetings(
  employeeId = getWorkEmployeeId()
): Promise<ApiResponse<WorkMeeting[]>> {
  return getWorkMeetings({ employeeId });
}
