// Barrel: keeps the original public import path stable while the
// implementation is split across focused files (core + domain producers).
export {
  emptyNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyQuietly,
  pushNotification,
  resolveEmployeeName,
} from "@/services/notification-core.service";
export type { CreateNotificationInput } from "@/services/notification-core.service";

export {
  notifyAnnouncement,
  notifyEarlyLeave,
  notifyEmployeeCreated,
  notifyEmployeeStatusChanged,
  notifyLateCheckIn,
  notifyLeaveCancelled,
  notifyLeaveDecision,
  notifyLeaveSubmitted,
} from "@/services/notify-people.service";

export {
  notifyMeetingScheduled,
  notifyPayrollAdvanced,
  notifyTargetAssigned,
  notifyTargetProgress,
  notifyTargetWarning,
  notifyTaskAssigned,
  notifyTaskCompleted,
} from "@/services/notify-work.service";
