import { enrichWithAudit, touchEntity } from "@/lib/entity";
import { createId } from "@/lib/id";
import { isApiMode } from "@/lib/env";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";
import {
  deleteWorkMeetingRemote,
  patchWorkMeeting,
  postWorkMeeting,
} from "@/api/work.api";
import { workMeetingRepository } from "@/repositories/work.repository";
import {
  createWorkMeetingSchema,
  updateWorkMeetingSchema,
  type CreateWorkMeetingDto,
  type UpdateWorkMeetingDto,
} from "@/schemas/work.schema";
import { fromError, ok } from "@/services/api-result";
import { emitWorkUpdated } from "@/lib/events";
import { forcePersonalMeetingPayload } from "@/lib/work-utils";
import { AppRole } from "@/constants/roles";
import {
  actorContext,
  assertEmployeeCanEditMeeting,
  emptyMeeting,
} from "@/services/work/work-shared";
import type { ApiResponse } from "@/types";
import type { WorkMeeting } from "@/types/work";

/** POST /work/meetings */
export async function createWorkMeeting(
  input: CreateWorkMeetingDto
): Promise<ApiResponse<WorkMeeting>> {
  const { role, userId, employeeId } = actorContext();
  const normalized =
    role === AppRole.employee
      ? forcePersonalMeetingPayload(input, employeeId)
      : input;

  if (isApiMode()) {
    const res = await postWorkMeeting(normalized);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const parsed = createWorkMeetingSchema.safeParse(normalized);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid meeting payload",
        parsed.error.flatten()
      );
    }
    if (role === AppRole.employee && parsed.data.origin !== "personal") {
      throw new ForbiddenError("Employees can only create personal meetings");
    }
    const actor = userId;
    const data = parsed.data;
    const participantIds = Array.from(
      new Set([data.organizerId, ...data.participantIds])
    );
    const meeting = enrichWithAudit(
      {
        id: createId("meet"),
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        organizerId: data.organizerId,
        participantIds,
        agenda: data.agenda ?? [],
        notes: data.notes ?? "",
        joinUrl: data.joinUrl || undefined,
        origin: data.origin ?? "assigned",
      } satisfies Omit<WorkMeeting, keyof import("@/types").BaseEntity>,
      actor
    );
    await workMeetingRepository.create(meeting);
    emitWorkUpdated();
    const { notifyMeetingScheduled } = await import(
      "@/services/notification.service"
    );
    void notifyMeetingScheduled({
      meetingId: meeting.id,
      title: meeting.title,
      participantIds: meeting.participantIds,
      actorId: actor,
      origin: meeting.origin,
    });
    return ok(meeting, "Meeting created");
  } catch (error) {
    return fromError(error, emptyMeeting(""));
  }
}

/** PATCH /work/meetings/:id */
export async function updateWorkMeeting(
  id: string,
  input: UpdateWorkMeetingDto
): Promise<ApiResponse<WorkMeeting>> {
  const { role, userId, employeeId } = actorContext();
  const payload: UpdateWorkMeetingDto =
    role === AppRole.employee
      ? {
          ...input,
          origin: "personal",
          organizerId: employeeId,
          participantIds: Array.from(
            new Set([
              employeeId,
              ...(input.participantIds ?? []),
            ])
          ),
        }
      : input;

  if (isApiMode()) {
    const res = await patchWorkMeeting(id, payload);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const parsed = updateWorkMeetingSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ValidationError(
        "Invalid meeting payload",
        parsed.error.flatten()
      );
    }
    const current = await workMeetingRepository.findById(id);
    if (!current) throw new NotFoundError("Meeting not found");
    assertEmployeeCanEditMeeting(current);
    const actor = userId;
    const patch = { ...parsed.data };
    if (patch.joinUrl === "") patch.joinUrl = undefined;
    if (role === AppRole.employee) {
      patch.origin = "personal";
      patch.organizerId = employeeId;
      const participants = patch.participantIds ?? current.participantIds;
      patch.participantIds = Array.from(new Set([employeeId, ...participants]));
    } else if (patch.organizerId || patch.participantIds) {
      const organizerId = patch.organizerId ?? current.organizerId;
      const participants = patch.participantIds ?? current.participantIds;
      patch.participantIds = Array.from(new Set([organizerId, ...participants]));
      patch.organizerId = organizerId;
    }
    const next = touchEntity(current, actor, patch);
    const saved = await workMeetingRepository.update(id, next);
    if (!saved) throw new NotFoundError("Meeting not found");
    emitWorkUpdated();
    return ok(saved, "Meeting updated");
  } catch (error) {
    return fromError(error, emptyMeeting(id));
  }
}

/** DELETE /work/meetings/:id */
export async function deleteWorkMeeting(
  id: string
): Promise<ApiResponse<boolean>> {
  if (isApiMode()) {
    const res = await deleteWorkMeetingRemote(id);
    if (res.success) emitWorkUpdated();
    return res;
  }
  try {
    const current = await workMeetingRepository.findById(id);
    if (!current) throw new NotFoundError("Meeting not found");
    assertEmployeeCanEditMeeting(current);
    const deleted = await workMeetingRepository.delete(id);
    if (!deleted) throw new NotFoundError("Meeting not found");
    emitWorkUpdated();
    return ok(true, "Meeting deleted");
  } catch (error) {
    return fromError(error, false);
  }
}
