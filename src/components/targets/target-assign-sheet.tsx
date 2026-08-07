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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeMultiPicker } from "@/components/work/employee-multi-picker";
import { assignTarget, updateTarget } from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { emitTargetsUpdated } from "@/lib/events";
import { todayIsoDate } from "@/lib/work-utils";
import type { Employee } from "@/types";
import type {
  PerformanceTarget,
  TargetCategory,
  TargetPriority,
  TargetType,
} from "@/types/targets";

interface FormState {
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

function defaultForm(): FormState {
  const start = todayIsoDate();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return {
    title: "",
    description: "",
    categoryId: "",
    typeId: "",
    quantity: 10,
    unit: "unit",
    startDate: start,
    endDate: end.toISOString().slice(0, 10),
    priority: "medium",
    weight: 1,
    assigneeIds: [],
    department: "",
    notes: "",
    generateTasks: true,
  };
}

function formFromTarget(target: PerformanceTarget): FormState {
  return {
    title: target.title,
    description: target.description,
    categoryId: target.categoryId,
    typeId: target.typeId,
    quantity: target.quantity,
    unit: target.unit,
    startDate: target.startDate.slice(0, 10),
    endDate: target.endDate.slice(0, 10),
    priority: target.priority,
    weight: target.weight,
    assigneeIds: [...target.assigneeIds],
    department: target.department,
    notes: target.notes,
    generateTasks: false,
  };
}

interface TargetAssignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TargetCategory[];
  types: TargetType[];
  employees: Employee[];
  editingTarget?: PerformanceTarget | null;
  /** Prefill category from hub sidebar selection when creating. */
  defaultCategoryId?: string;
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
  onSaved,
}: TargetAssignSheetProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [busy, setBusy] = useState(false);
  const isEditing = Boolean(editingTarget);

  const selectableCategories = useMemo(() => {
    const active = categories.filter((c) => c.active);
    if (!editingTarget) return active;
    const current = categories.find((c) => c.id === editingTarget.categoryId);
    if (current && !current.active) return [current, ...active];
    return active;
  }, [categories, editingTarget]);

  useEffect(() => {
    if (!open) return;
    if (editingTarget) {
      setForm(formFromTarget(editingTarget));
      return;
    }
    const base = defaultForm();
    const preferred =
      defaultCategoryId &&
      categories.some((c) => c.id === defaultCategoryId && c.active)
        ? defaultCategoryId
        : categories.find((c) => c.active)?.id ?? "";
    if (preferred) {
      const firstType = types.find(
        (ty) => ty.categoryId === preferred && ty.active
      );
      setForm({
        ...base,
        categoryId: preferred,
        typeId: firstType?.id ?? "",
        unit: firstType?.unit ?? base.unit,
      });
      return;
    }
    setForm(base);
  }, [open, editingTarget, defaultCategoryId, categories, types]);

  const typesForCategory = useMemo(
    () =>
      types.filter(
        (ty) =>
          ty.categoryId === form.categoryId &&
          (ty.active || ty.id === editingTarget?.typeId)
      ),
    [types, form.categoryId, editingTarget?.typeId]
  );

  function patch(next: Partial<FormState>) {
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
    patch({ typeId, unit: type?.unit ?? form.unit });
  }

  async function onSubmit() {
    if (
      !form.title.trim() ||
      (!isEditing && (!form.categoryId || !form.typeId)) ||
      form.assigneeIds.length === 0 ||
      !form.startDate ||
      !form.endDate
    ) {
      toast.error(t("targets.assign.validationError"));
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error(t("targets.assign.validationError"));
      return;
    }

    setBusy(true);
    const res =
      isEditing && editingTarget
        ? await updateTarget(editingTarget.id, {
            title: form.title.trim(),
            description: form.description.trim(),
            priority: form.priority,
            weight: form.weight,
            notes: form.notes.trim(),
            startDate: form.startDate,
            endDate: form.endDate,
            assigneeIds: form.assigneeIds,
            department: form.department.trim(),
          })
        : await assignTarget({
            title: form.title.trim(),
            description: form.description.trim(),
            categoryId: form.categoryId,
            typeId: form.typeId,
            quantity: form.quantity,
            unit: form.unit.trim() || "unit",
            startDate: form.startDate,
            endDate: form.endDate,
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
            generateTasks: form.generateTasks,
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

        <div className="mt-6 grid flex-1 gap-5">
          <Field label={t("targets.assign.fieldTitle")} htmlFor="tgt-title">
            <Input
              id="tgt-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </Field>

          <Field label={t("common.description")} htmlFor="tgt-desc">
            <Textarea
              id="tgt-desc"
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("targets.assign.fieldCategory")} htmlFor="tgt-cat">
              <Select
                value={form.categoryId}
                onValueChange={onCategoryChange}
                disabled={isEditing}
              >
                <SelectTrigger id="tgt-cat">
                  <SelectValue placeholder={t("targets.assign.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {selectableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("targets.assign.fieldType")} htmlFor="tgt-type">
              <Select
                value={form.typeId}
                onValueChange={onTypeChange}
                disabled={isEditing || !form.categoryId}
              >
                <SelectTrigger id="tgt-type">
                  <SelectValue placeholder={t("targets.assign.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {typesForCategory.map((ty) => (
                    <SelectItem key={ty.id} value={ty.id}>
                      {ty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("targets.assign.fieldQuantity")} htmlFor="tgt-qty">
              <Input
                id="tgt-qty"
                type="number"
                min={1}
                max={1000}
                value={form.quantity}
                disabled={isEditing}
                onChange={(e) => patch({ quantity: Number(e.target.value) || 1 })}
              />
            </Field>
            <Field label={t("targets.assign.fieldUnit")} htmlFor="tgt-unit">
              <Input
                id="tgt-unit"
                value={form.unit}
                disabled={isEditing}
                onChange={(e) => patch({ unit: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("targets.assign.fieldStartDate")} htmlFor="tgt-start">
              <Input
                id="tgt-start"
                type="date"
                value={form.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </Field>
            <Field label={t("targets.assign.fieldEndDate")} htmlFor="tgt-end">
              <Input
                id="tgt-end"
                type="date"
                value={form.endDate}
                onChange={(e) => patch({ endDate: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("targets.assign.fieldPriority")} htmlFor="tgt-priority">
              <Select
                value={form.priority}
                onValueChange={(v) => patch({ priority: v as TargetPriority })}
              >
                <SelectTrigger id="tgt-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">{t("targets.priority.critical")}</SelectItem>
                  <SelectItem value="high">{t("targets.priority.high")}</SelectItem>
                  <SelectItem value="medium">{t("targets.priority.medium")}</SelectItem>
                  <SelectItem value="low">{t("targets.priority.low")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("targets.assign.fieldDepartment")} htmlFor="tgt-dept">
              <Input
                id="tgt-dept"
                value={form.department}
                onChange={(e) => patch({ department: e.target.value })}
              />
            </Field>
          </div>

          <EmployeeMultiPicker
            employees={employees}
            selectedIds={form.assigneeIds}
            onChange={(assigneeIds) => patch({ assigneeIds })}
            label={t("targets.assign.fieldAssignees")}
          />

          <Field label={t("targets.assign.fieldNotes")} htmlFor="tgt-notes">
            <Textarea
              id="tgt-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>

          {!isEditing ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t("targets.assign.fieldGenerateTasks")}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {t("targets.assign.generateTasksDesc")}
                </p>
              </div>
              <Switch
                checked={form.generateTasks}
                onCheckedChange={(generateTasks) => patch({ generateTasks })}
                aria-label={t("targets.assign.fieldGenerateTasks")}
              />
            </div>
          ) : null}
        </div>

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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
