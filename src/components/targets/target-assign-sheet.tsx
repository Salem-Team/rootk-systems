"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { assignTarget, updateTarget } from "@/services/targets.service";
import { useHydrateOnOpen } from "@/hooks/use-hydrate-on-open";
import { useTranslation } from "@/hooks/use-translation";
import { emitTargetsUpdated, emitWorkUpdated } from "@/lib/events";
import { isOrganicAdsType } from "@/lib/organic-ads-task-match";
import { isValidDateTimeRange, toStorageIso } from "@/lib/flexible-datetime";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetCategory, TargetType } from "@/types/targets";
import {
  defaultTargetAssignForm,
  formFromCatalog,
  targetAssignFormFromTarget,
  type TargetAssignFormState,
} from "./target-assign-form-state";
import { TargetAssignFormFields } from "./target-assign-form-fields";

interface TargetAssignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TargetCategory[];
  types: TargetType[];
  employees: Employee[];
  editingTarget?: PerformanceTarget | null;
  /** Prefill category from hub sidebar selection when creating. */
  defaultCategoryId?: string;
  defaultTypeId?: string;
  defaultQuantity?: number;
  defaultAssigneeIds?: string[];
  onSaved: (target: PerformanceTarget) => void;
}

/** Admin drawer for assigning (or editing) a performance target. */
export function TargetAssignSheet({
  open,
  onOpenChange,
  categories,
  types,
  employees,
  editingTarget,
  defaultCategoryId,
  defaultTypeId,
  defaultQuantity,
  defaultAssigneeIds,
  onSaved,
}: TargetAssignSheetProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TargetAssignFormState>(defaultTargetAssignForm);
  const [busy, setBusy] = useState(false);
  const isEditing = Boolean(editingTarget);

  const selectableCategories = useMemo(() => {
    const active = categories.filter((c) => c.active);
    if (!editingTarget) return active;
    const current = categories.find((c) => c.id === editingTarget.categoryId);
    if (current && !current.active) return [current, ...active];
    return active;
  }, [categories, editingTarget]);

  useHydrateOnOpen(
    open,
    `${editingTarget?.id ?? "create"}:${(defaultAssigneeIds ?? []).join(",")}:${defaultTypeId ?? ""}`,
    () => {
      if (editingTarget) {
        setForm(targetAssignFormFromTarget(editingTarget));
        return;
      }
      setForm({
        ...formFromCatalog(defaultCategoryId, categories, types, {
          typeId: defaultTypeId,
          quantity: defaultQuantity,
        }),
        assigneeIds: defaultAssigneeIds ?? [],
      });
    }
  );

  // Fill category/type if catalog arrived after open — never clobber typed fields.
  useEffect(() => {
    if (!open || editingTarget) return;
    setForm((prev) => {
      if (prev.categoryId) return prev;
      const next = formFromCatalog(defaultCategoryId, categories, types, {
        typeId: defaultTypeId,
        quantity: defaultQuantity,
      });
      if (!next.categoryId) return prev;
      return {
        ...prev,
        categoryId: next.categoryId,
        typeId: next.typeId || prev.typeId,
        unit: next.unit || prev.unit,
        quantity: next.quantity || prev.quantity,
      };
    });
  }, [
    open,
    editingTarget,
    defaultCategoryId,
    defaultTypeId,
    defaultQuantity,
    categories,
    types,
  ]);

  const typesForCategory = useMemo(
    () =>
      types.filter(
        (ty) =>
          ty.categoryId === form.categoryId &&
          (ty.active || ty.id === editingTarget?.typeId)
      ),
    [types, form.categoryId, editingTarget?.typeId]
  );

  function patch(next: Partial<TargetAssignFormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function onCategoryChange(categoryId: string) {
    const firstType = types.find(
      (ty) => ty.categoryId === categoryId && ty.active
    );
    patch({
      categoryId,
      typeId: firstType?.id ?? "",
      unit: firstType?.unit ?? form.unit,
    });
  }

  function onTypeChange(typeId: string) {
    const type = types.find((ty) => ty.id === typeId);
    patch({
      typeId,
      unit: type?.unit ?? form.unit,
      generateTasks: isOrganicAdsType(type) ? true : form.generateTasks,
    });
  }

  function validateForm(): string | null {
    if (!form.title.trim()) return t("targets.assign.errorTitle");
    if (!isEditing && !form.categoryId) return t("targets.assign.errorCategory");
    if (!isEditing && !form.typeId) return t("targets.assign.errorType");
    if (form.assigneeIds.length === 0) return t("targets.assign.errorAssignees");
    if (!form.startDate || !form.endDate) return t("targets.assign.errorDates");
    if (!isValidDateTimeRange(form.startDate, form.endDate)) {
      return t("targets.assign.errorDateRange");
    }
    return null;
  }

  async function onSubmit() {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const startIso = toStorageIso(form.startDate, "start");
    const endIso = toStorageIso(form.endDate, "end");
    const unit =
      form.unit.trim() ||
      types.find((ty) => ty.id === form.typeId)?.unit ||
      "unit";

    setBusy(true);
    const res =
      isEditing && editingTarget
        ? await updateTarget(editingTarget.id, {
            title: form.title.trim(),
            description: form.description.trim(),
            priority: form.priority,
            weight: form.weight,
            notes: form.notes.trim(),
            startDate: startIso,
            endDate: endIso,
            assigneeIds: form.assigneeIds,
            department: form.department.trim(),
          })
        : await assignTarget({
            title: form.title.trim(),
            description: form.description.trim(),
            categoryId: form.categoryId,
            typeId: form.typeId,
            quantity: form.quantity,
            unit,
            startDate: startIso,
            endDate: endIso,
            priority: form.priority,
            weight: form.weight,
            assigneeScope: form.assigneeIds.length > 1 ? "multi" : "employee",
            assigneeIds: form.assigneeIds,
            department: form.department.trim(),
            branch: "",
            roleKey: "",
            ownerId: "",
            notes: form.notes.trim(),
            status: "assigned",
            generateTasks:
              isOrganicAdsType(
                types.find((ty) => ty.id === form.typeId)
              ) || form.generateTasks,
          });
    setBusy(false);

    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(
      isEditing ? t("targets.assign.updated") : t("targets.assign.success")
    );
    onSaved(res.data);
    emitTargetsUpdated();
    emitWorkUpdated();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t("targets.assign.editTitle") : t("targets.assign.title")}
          </SheetTitle>
          <SheetDescription>{t("targets.assign.description")}</SheetDescription>
        </SheetHeader>

        <TargetAssignFormFields
          form={form}
          patch={patch}
          isEditing={isEditing}
          selectableCategories={selectableCategories}
          typesForCategory={typesForCategory}
          employees={employees}
          onCategoryChange={onCategoryChange}
          onTypeChange={onTypeChange}
          forceGenerateTasks={isOrganicAdsType(
            types.find((ty) => ty.id === form.typeId)
          )}
        />

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void onSubmit()}>
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isEditing ? t("common.save") : t("targets.assign.submit")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
