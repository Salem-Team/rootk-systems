"use client";

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
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { TargetCategory, TargetPriority, TargetType } from "@/types/targets";
import type { TargetAssignFormState } from "./target-assign-form-state";

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

export function TargetAssignFormFields({
  form,
  patch,
  isEditing,
  selectableCategories,
  typesForCategory,
  employees,
  onCategoryChange,
  onTypeChange,
  forceGenerateTasks = false,
}: {
  form: TargetAssignFormState;
  patch: (next: Partial<TargetAssignFormState>) => void;
  isEditing: boolean;
  selectableCategories: TargetCategory[];
  typesForCategory: TargetType[];
  employees: Employee[];
  onCategoryChange: (categoryId: string) => void;
  onTypeChange: (typeId: string) => void;
  forceGenerateTasks?: boolean;
}) {
  const { t } = useTranslation();

  return (
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
            type="datetime-local"
            step={60}
            value={form.startDate}
            onChange={(e) => patch({ startDate: e.target.value })}
          />
        </Field>
        <Field label={t("targets.assign.fieldEndDate")} htmlFor="tgt-end">
          <Input
            id="tgt-end"
            type="datetime-local"
            step={60}
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => patch({ endDate: e.target.value })}
          />
        </Field>
      </div>
      <p className="-mt-3 text-[12px] leading-relaxed text-muted-foreground">
        {t("targets.assign.dateTimeHint")}
      </p>

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
              {forceGenerateTasks
                ? t("targets.assign.generateTasksAdsDesc")
                : t("targets.assign.generateTasksDesc")}
            </p>
          </div>
          <Switch
            checked={forceGenerateTasks || form.generateTasks}
            onCheckedChange={(generateTasks) => {
              if (forceGenerateTasks) return;
              patch({ generateTasks });
            }}
            disabled={forceGenerateTasks}
            aria-label={t("targets.assign.fieldGenerateTasks")}
          />
        </div>
      ) : null}
    </div>
  );
}
