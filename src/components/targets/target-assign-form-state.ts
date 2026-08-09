import { defaultTargetWindow, toDateTimeLocalValue } from "@/lib/flexible-datetime";
import type { PerformanceTarget, TargetPriority } from "@/types/targets";

export interface TargetAssignFormState {
  title: string;
  description: string;
  categoryId: string;
  typeId: string;
  quantity: number;
  unit: string;
  startDate: string;
  endDate: string;
  priority: TargetPriority;
  weight: number;
  assigneeIds: string[];
  department: string;
  notes: string;
  generateTasks: boolean;
}

export function defaultTargetAssignForm(): TargetAssignFormState {
  const window = defaultTargetWindow();
  return {
    title: "",
    description: "",
    categoryId: "",
    typeId: "",
    quantity: 10,
    unit: "unit",
    startDate: window.start,
    endDate: window.end,
    priority: "medium",
    weight: 1,
    assigneeIds: [],
    department: "",
    notes: "",
    generateTasks: true,
  };
}

export function targetAssignFormFromTarget(
  target: PerformanceTarget
): TargetAssignFormState {
  return {
    title: target.title,
    description: target.description,
    categoryId: target.categoryId,
    typeId: target.typeId,
    quantity: target.quantity,
    unit: target.unit,
    startDate: toDateTimeLocalValue(target.startDate),
    endDate: toDateTimeLocalValue(target.endDate),
    priority: target.priority,
    weight: target.weight,
    assigneeIds: [...target.assigneeIds],
    department: target.department,
    notes: target.notes,
    generateTasks: false,
  };
}
