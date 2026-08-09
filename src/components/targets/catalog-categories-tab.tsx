"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  removeTargetCategory,
  saveTargetCategory,
} from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import type { TargetCategory } from "@/types/targets";

function emptyCategory(): TargetCategory & { id?: string } {
  return {
    id: "",
    name: "",
    color: "#082868",
    icon: "Target",
    description: "",
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

export function CategoriesTab({
  categories,
  onChanged,
}: {
  categories: TargetCategory[];
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(emptyCategory());

  function openCreate() {
    setDraft(emptyCategory());
    setOpen(true);
  }

  function openEdit(cat: TargetCategory) {
    setDraft(cat);
    setOpen(true);
  }

  async function onSave() {
    if (!draft.name.trim()) {
      toast.error(t("targets.catalog.nameRequired"));
      return;
    }
    setBusy(true);
    const res = await saveTargetCategory({
      id: draft.id || undefined,
      name: draft.name.trim(),
      color: draft.color,
      icon: draft.icon,
      description: draft.description,
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
    const res = await removeTargetCategory(id);
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
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("targets.catalog.addCategory")}
        </Button>
      </div>
      {categories.length === 0 ? (
        <EmptyState compact title={t("targets.catalog.emptyCategories")} />
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <SoftListRow key={cat.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{cat.name}</p>
                  {cat.description ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {cat.description}
                    </p>
                  ) : null}
                </div>
                {!cat.active ? (
                  <Badge variant="secondary">{t("status.inactive")}</Badge>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}>
                  {t("common.edit")}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onDelete(cat.id)}
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
              {draft.id ? t("targets.catalog.editCategory") : t("targets.catalog.addCategory")}
            </SheetTitle>
            <SheetDescription>{t("targets.catalog.categoryFormDesc")}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3.5 py-4">
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
                <Label>{t("targets.catalog.fieldColor")}</Label>
                <Input
                  type="color"
                  className="h-9 cursor-pointer p-1"
                  value={draft.color}
                  onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
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
