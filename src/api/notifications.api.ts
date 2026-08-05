import type {
  NotificationFilters,
  PushNotificationInput,
} from "@/api/contracts";
import { api } from "@/api/http";
import { API_ROUTES, toQuery } from "@/api/routes";
import type { ApiResponse, AppNotification, UserRole } from "@/types";

function emptyNotification(id = ""): AppNotification {
  return {
    id,
    titleKey: "",
    bodyKey: "",
    category: "system",
    priority: "normal",
    audience: "all",
    readBy: [],
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

/** GET /notifications */
export function fetchNotifications(
  role: UserRole,
  filters: NotificationFilters = {}
): Promise<ApiResponse<AppNotification[]>> {
  return api.getList(
    `${API_ROUTES.notifications.root}${toQuery({
      role: filters.role ?? role,
      category: filters.category,
      unreadOnly: filters.unreadOnly,
      page: filters.page,
      pageSize: filters.pageSize,
      cursor: filters.cursor,
    })}`
  );
}

/** POST /notifications */
export function postNotification(
  input: PushNotificationInput
): Promise<ApiResponse<AppNotification>> {
  return api.post(API_ROUTES.notifications.root, input, emptyNotification());
}

/** PATCH /notifications/:id/read */
export function patchNotificationRead(
  id: string
): Promise<ApiResponse<AppNotification | null>> {
  return api.patch(API_ROUTES.notifications.read(id), {}, null);
}

/** POST /notifications/read-all */
/** POST /notifications/read-all */
export function postMarkAllNotificationsRead(): Promise<
  ApiResponse<AppNotification[]>
> {
  return api.post(API_ROUTES.notifications.readAll, {}, []);
}
