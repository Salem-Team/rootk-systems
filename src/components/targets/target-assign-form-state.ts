import { defaultTargetWindow, toDateTimeLocalValue } from "@/lib/flexible-datetime";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetPriority,
  TargetType,
} from "@/types/targets";

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

export function formFromCatalog(
  defaultCategoryId: string | undefined,
  categories: TargetCategory[],
  types: TargetType[],
  options?: { typeId?: string; quantity?: number }
): TargetAssignFormState {
  const base = defaultTargetAssignForm();
  const preferredType =
    options?.typeId && types.some((ty) => ty.id === options.typeId && ty.active)
      ? types.find((ty) => ty.id === options.typeId)
      : undefined;
  const preferred =
    preferredType?.categoryId ||
    (defaultCategoryId &&
    categories.some((c) => c.id === defaultCategoryId && c.active)
      ? defaultCategoryId
      : categories.find((c) => c.active)?.id ?? "");
  if (!preferred) return base;
  const firstType =
    preferredType && preferredType.categoryId === preferred
      ? preferredType
      : types.find((ty) => ty.categoryId === preferred && ty.active);
  return {
    ...base,
    categoryId: preferred,
    typeId: firstType?.id ?? "",
    unit: firstType?.unit ?? base.unit,
    quantity: options?.quantity ?? base.quantity,
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
