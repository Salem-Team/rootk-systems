"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SoftListRow } from "@/components/shared/meta-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import {
  getTargetCategories,
  getTargetTemplates,
  getTargetTypes,
  removeTargetCategory,
  removeTargetTemplate,
  removeTargetType,
  saveTargetCategory,
  saveTargetTemplate,
  saveTargetType,
} from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { emitTargetsUpdated } from "@/lib/events";
import type {
  TargetCategory,
  TargetTemplate,
  TargetTemplateItem,
  TargetType,
} from "@/types/targets";

const NONE = "none";

/** Admin catalog CRUD (categories / types / templates) driving the assign flow. */
export function CatalogManager() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<TargetCategory[]>([]);
  const [types, setTypes] = useState<TargetType[]>([]);
  const [templates, setTemplates] = useState<TargetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("categories");

  const reload = useCallback(async () => {
    const [catRes, typeRes, tplRes] = await Promise.all([
      getTargetCategories(),
      getTargetTypes(),
      getTargetTemplates(),
    ]);
    if (catRes.success) setCategories(catRes.data);
    if (typeRes.success) setTypes(typeRes.data);
    if (tplRes.success) setTemplates(tplRes.data);
    emitTargetsUpdated();
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  if (loading) return <TableSkeleton rows={4} />;

  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <Tags className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("targets.catalog.title")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("targets.catalog.description")}
        </p>
      </div>
      <div className="panel-body">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="categories">
              {t("targets.catalog.tabCategories")}
              <span className="ms-1.5 font-mono text-[10px] opacity-70">
                {categories.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="types">
              {t("targets.catalog.tabTypes")}
              <span className="ms-1.5 font-mono text-[10px] opacity-70">
                {types.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="templates">
              {t("targets.catalog.tabTemplates")}
              <span className="ms-1.5 font-mono text-[10px] opacity-70">
                {templates.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <CategoriesTab categories={categories} onChanged={reload} />
          </TabsContent>
          <TabsContent value="types">
            <TypesTab types={types} categories={categories} onChanged={reload} />
          </TabsContent>
          <TabsContent value="templates">
            <TemplatesTab
              templates={templates}
              categories={categories}
              types={types}
              onChanged={reload}
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

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

function CategoriesTab({
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

function TypesTab({
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

function TemplatesTab({
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("targets.catalog.templateItems")}</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("targets.catalog.addItem")}
                </Button>
              </div>
              {draft.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-[12px] text-muted-foreground">
                  {t("targets.catalog.noItems")}
                </p>
              ) : (
                <div className="space-y-2">
                  {draft.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border border-border/70 bg-muted/15 p-2.5"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={item.typeId}
                          onValueChange={(typeId) => {
                            const ty = typeMap.get(typeId);
                            updateItem(index, { typeId, unit: ty?.unit ?? item.unit });
                          }}
                        >
                          <SelectTrigger className="h-9 col-span-3 sm:col-span-1">
                            <SelectValue placeholder={t("targets.assign.selectType")} />
                          </SelectTrigger>
                          <SelectContent>
                            {types.map((ty) => (
                              <SelectItem key={ty.id} value={ty.id}>
                                {ty.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          className="h-9"
                          value={item.quantity}
                          placeholder={t("targets.assign.fieldQuantity")}
                          onChange={(e) =>
                            updateItem(index, { quantity: Number(e.target.value) || 1 })
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          className="h-9"
                          value={item.weight}
                          placeholder={t("targets.catalog.fieldWeight")}
                          onChange={(e) =>
                            updateItem(index, { weight: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
