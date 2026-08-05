export const LEAVE_UPDATED_EVENT = "rootk:leave-updated";
export const WORK_UPDATED_EVENT = "rootk:work-updated";
export const NOTIFICATION_UPDATED_EVENT = "rootk:notification-updated";

export type NotificationUpdatedDetail = {
  /** Play in-app chime when a new notification is created. */
  playSound?: boolean;
  audience?: import("@/types").NotificationAudience;
  recipientIds?: string[];
  category?: import("@/types").NotificationCategory;
  priority?: import("@/types").NotificationPriority;
};

export function emitLeaveUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LEAVE_UPDATED_EVENT));
}

export function emitWorkUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WORK_UPDATED_EVENT));
}

export function emitNotificationsUpdated(detail?: NotificationUpdatedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NotificationUpdatedDetail>(NOTIFICATION_UPDATED_EVENT, {
      detail: detail ?? {},
    })
  );
}
