import type { BaseEntity } from "@/types";

export type NotificationAudience = "all" | "admin" | "employee";

export type NotificationCategory =
  | "leave"
  | "attendance"
  | "work"
  | "payroll"
  | "schedule"
  | "announcement"
  | "system"
  | "mention"
  | "target"
  | "organic_ad";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/** In-app notification — maps to future NestJS Notification model. */
export interface AppNotification extends BaseEntity {
  id: string;
  /** i18n path for title */
  titleKey: string;
  /** i18n path for body */
  bodyKey: string;
  /** Interpolation vars for title/body */
  vars?: Record<string, string | number>;
  category: NotificationCategory;
  priority: NotificationPriority;
  audience: NotificationAudience;
  /**
   * When set, only these user/employee ids receive the notification
   * (still gated by audience).
   */
  recipientIds?: string[];
  href?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  /** User ids who marked this notification as read */
  readBy: string[];
  /** Legacy display label — prefer formatting from createdAt */
  timeLabel?: string;
}

export interface CreateNotificationInput {
  titleKey: string;
  bodyKey: string;
  vars?: Record<string, string | number>;
  category: NotificationCategory;
  priority?: NotificationPriority;
  audience: NotificationAudience;
  recipientIds?: string[];
  href?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
}
