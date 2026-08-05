import type {
  CreateWorkMeetingInput,
  CreateWorkTaskInput,
  UpdateWorkMeetingInput,
  UpdateWorkTaskInput,
  WorkMeetingFilters,
  WorkTaskFilters,
} from "@/api/contracts";
import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse } from "@/types";
import type { TaskStatus, WorkMeeting, WorkTask } from "@/types/work";

function emptyTask(id = ""): WorkTask {
  return {
    id,
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    tag: "",
    estimateMin: 30,
    assigneeIds: [],
    subItems: [],
    origin: "assigned",
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
}

function emptyMeeting(id = ""): WorkMeeting {
  return {
    id,
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    organizerId: "",
    participantIds: [],
    agenda: [],
    notes: "",
    origin: "assigned",
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
}

/** GET /work/tasks */
export function fetchWorkTasks(
  filters: WorkTaskFilters = {}
): Promise<ApiResponse<WorkTask[]>> {
  return api.getList(
    `${API_ROUTES.work.tasks}${toQuery({
      employeeId: filters.employeeId,
      status: filters.status,
      priority: filters.priority,
      origin: filters.origin,
      page: filters.page,
      pageSize: filters.pageSize,
      cursor: filters.cursor,
    })}`
  );
}

/** GET /work/tasks/:id */
export function fetchWorkTaskById(
  id: string
): Promise<ApiResponse<WorkTask | null>> {
  return api.get(API_ROUTES.work.taskById(id), null);
}

/** POST /work/tasks */
export function postWorkTask(
  input: CreateWorkTaskInput
): Promise<ApiResponse<WorkTask>> {
  return api.post(API_ROUTES.work.tasks, input, emptyTask());
}

/** PATCH /work/tasks/:id */
export function patchWorkTask(
  id: string,
  input: UpdateWorkTaskInput
): Promise<ApiResponse<WorkTask>> {
  return api.patch(API_ROUTES.work.taskById(id), input, emptyTask(id));
}

/** PATCH /work/tasks/:id/status */
export function patchWorkTaskStatus(
  id: string,
  status: TaskStatus
): Promise<ApiResponse<WorkTask>> {
  return api.patch(API_ROUTES.work.taskStatus(id), { status }, emptyTask(id));
}

/** PATCH /work/tasks/:id/sub-items/:subId */
export function patchWorkTaskSubItemToggle(
  id: string,
  subId: string
): Promise<ApiResponse<WorkTask>> {
  return api.patch(
    API_ROUTES.work.taskSubItem(id, subId),
    {},
    emptyTask(id)
  );
}

/** DELETE /work/tasks/:id */
export function deleteWorkTaskRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.work.taskById(id), false);
}

/** GET /work/meetings */
export function fetchWorkMeetings(
  filters: WorkMeetingFilters = {}
): Promise<ApiResponse<WorkMeeting[]>> {
  return api.getList(
    `${API_ROUTES.work.meetings}${toQuery({
      employeeId: filters.employeeId,
      date: filters.date,
      from: filters.from,
      to: filters.to,
      page: filters.page,
      pageSize: filters.pageSize,
      cursor: filters.cursor,
    })}`
  );
}

/** POST /work/meetings */
export function postWorkMeeting(
  input: CreateWorkMeetingInput
): Promise<ApiResponse<WorkMeeting>> {
  return api.post(API_ROUTES.work.meetings, input, emptyMeeting());
}

/** PATCH /work/meetings/:id */
export function patchWorkMeeting(
  id: string,
  input: UpdateWorkMeetingInput
): Promise<ApiResponse<WorkMeeting>> {
  return api.patch(API_ROUTES.work.meetingById(id), input, emptyMeeting(id));
}

/** DELETE /work/meetings/:id */
export function deleteWorkMeetingRemote(
  id: string
): Promise<ApiResponse<boolean>> {
  return api.delete(API_ROUTES.work.meetingById(id), false);
}
