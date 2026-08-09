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
import {
  removeTargetTemplate,
  saveTargetTemplate,
} from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import type {
  TargetCategory,
  TargetTemplate,
  TargetTemplateItem,
  TargetType,
} from "@/types/targets";
import { TemplateItemsEditor } from "./catalog-template-items-editor";

const NONE = "none";

function emptyTemplate(): {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  active: boolean;
  items: TargetTemplateItem[];
} {
  return {
    id: "",
    name: "",
    description: "",
    categoryId: "",
    active: true,
    items: [],
  };
}

export function TemplatesTab({
  templates,
  categories,
  types,
  onChanged,
}: {
  templates: TargetTemplate[];
  categories: TargetCategory[];
  types: TargetType[];
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(emptyTemplate());
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const typeMap = new Map(types.map((ty) => [ty.id, ty]));

  function openCreate() {
    setDraft(emptyTemplate());
    setOpen(true);
  }

  function openEdit(tpl: TargetTemplate) {
    setDraft({
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      categoryId: tpl.categoryId ?? "",
      active: tpl.active,
      items: tpl.items,
    });
    setOpen(true);
  }

  function addItem() {
    const firstType = types[0];
    if (!firstType) return;
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          id: `item-${d.items.length}`,
          companyId: "",
          templateId: d.id,
          typeId: firstType.id,
          quantity: 1,
          unit: firstType.unit,
          weight: 1,
          sortOrder: d.items.length,
        },
      ],
    }));
  }

  function updateItem(index: number, patch: Partial<TargetTemplateItem>) {
    setDraft((d) => ({
      ...d,
      items: d.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(index: number) {
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== index) }));
  }

  async function onSave() {
    if (!draft.name.trim() || draft.items.length === 0) {
      toast.error(t("targets.catalog.templateValidation"));
      return;
    }
    setBusy(true);
    const res = await saveTargetTemplate({
      id: draft.id || undefined,
      name: draft.name.trim(),
      description: draft.description,
      categoryId: draft.categoryId || null,
      active: draft.active,
      items: draft.items.map((item, i) => ({
        id: item.id.startsWith("item-") ? undefined : item.id,
        typeId: item.typeId,
        quantity: item.quantity,
        unit: item.unit,
        weight: item.weight,
        sortOrder: i,
      })),
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
    const res = await removeTargetTemplate(id);
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
        <Button size="sm" onClick={openCreate} disabled={types.length === 0}>
          <Plus className="h-4 w-4" />
          {t("targets.catalog.addTemplate")}
        </Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState compact title={t("targets.catalog.emptyTemplates")} />
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <SoftListRow key={tpl.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{tpl.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {tpl.categoryId ? categoryMap.get(tpl.categoryId)?.name : t("common.all")}
                  {" · "}
                  {t("targets.catalog.itemsCount", { count: tpl.items.length })}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(tpl)}>
                  {t("common.edit")}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onDelete(tpl.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </SoftListRow>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {draft.id ? t("targets.catalog.editTemplate") : t("targets.catalog.addTemplate")}
            </SheetTitle>
            <SheetDescription>{t("targets.catalog.templateFormDesc")}</SheetDescription>
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
            <div className="space-y-1.5">
              <Label>{t("targets.catalog.fieldCategoryOptional")}</Label>
              <Select
                value={draft.categoryId || NONE}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, categoryId: v === NONE ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("common.all")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TemplateItemsEditor
              items={draft.items}
              types={types}
              typeMap={typeMap}
              onAdd={addItem}
              onUpdate={updateItem}
              onRemove={removeItem}
            />

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
