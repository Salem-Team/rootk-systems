import type { TaskStatus } from "@/types/work";
import type { TranslationPath } from "@/i18n";

export const PRIORITY_VARIANT = {
  high: "danger",
  medium: "warning",
  low: "info",
} as const;

export type WorkTab = "tasks" | "meetings" | "day";
export type OriginFilter = "all" | "assigned" | "personal";
export type ComposerMode = "task" | "meeting" | null;

export function statusLabelKey(status: TaskStatus): TranslationPath {
  if (status === "todo") return "ops.statusTodo";
  if (status === "in_progress") return "ops.statusInProgress";
  return "ops.statusCompleted";
}
