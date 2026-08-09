"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SoftListRow } from "@/components/shared/meta-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { removeTargetType, saveTargetType } from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import type { TargetCategory, TargetType } from "@/types/targets";

function emptyType(categoryId: string): TargetType & { id?: string } {
  return {
    id: "",
    categoryId,
    name: "",
    description: "",
    unit: "unit",
    taskTitleTemplate: "{name} #{n}",
    active: true,
    sortOrder: 0,
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

export function TypesTab({
  types,
  categories,
  onChanged,
}: {
  types: TargetType[];
  categories: TargetCategory[];
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(emptyType(categories[0]?.id ?? ""));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  function openCreate() {
    setDraft(emptyType(categories[0]?.id ?? ""));
    setOpen(true);
  }

  function openEdit(type: TargetType) {
    setDraft(type);
    setOpen(true);
  }

  async function onSave() {
    if (!draft.name.trim() || !draft.categoryId) {
      toast.error(t("targets.catalog.nameRequired"));
      return;
    }
    setBusy(true);
    const res = await saveTargetType({
      id: draft.id || undefined,
      categoryId: draft.categoryId,
      name: draft.name.trim(),
      description: draft.description,
      unit: draft.unit.trim() || "unit",
      taskTitleTemplate: draft.taskTitleTemplate.trim() || "{name} #{n}",
      active: draft.active,
      sortOrder: draft.sortOrder,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setOpen(false);
    await onChanged();
    toast.success(t("targets.catalog.saved"));
  }

  async function onDelete(id: string) {
    setBusy(true);
    const res = await removeTargetType(id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await onChanged();
    toast.success(t("targets.catalog.removed"));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} disabled={categories.length === 0}>
          <Plus className="h-4 w-4" />
          {t("targets.catalog.addType")}
        </Button>
      </div>
      {types.length === 0 ? (
        <EmptyState compact title={t("targets.catalog.emptyTypes")} />
      ) : (
        <div className="space-y-2">
          {types.map((type) => (
            <SoftListRow key={type.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{type.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {categoryMap.get(type.categoryId)?.name ?? "—"} · {type.unit}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(type)}>
                  {t("common.edit")}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onDelete(type.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </SoftListRow>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {draft.id ? t("targets.catalog.editType") : t("targets.catalog.addType")}
            </SheetTitle>
            <SheetDescription>{t("targets.catalog.typeFormDesc")}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3.5 py-4">
            <div className="space-y-1.5">
              <Label>{t("targets.assign.fieldCategory")}</Label>
              <Select
                value={draft.categoryId}
                onValueChange={(categoryId) => setDraft((d) => ({ ...d, categoryId }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("targets.assign.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("targets.catalog.fieldName")}</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.description")}</Label>
              <Textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label>{t("targets.assign.fieldUnit")}</Label>
                <Input
                  value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("targets.catalog.fieldSortOrder")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.sortOrder}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("targets.catalog.fieldTaskTemplate")}</Label>
              <Input
                value={draft.taskTitleTemplate}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, taskTitleTemplate: e.target.value }))
                }
                placeholder="{name} #{n}"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("targets.catalog.taskTemplateHint")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.active}
                onCheckedChange={(active) => setDraft((d) => ({ ...d, active }))}
              />
              <Label>{t("status.active")}</Label>
            </div>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={busy} onClick={() => void onSave()}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
