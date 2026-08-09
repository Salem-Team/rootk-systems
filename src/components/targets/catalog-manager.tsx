"use client";

import { useCallback, useEffect, useState } from "react";
import { Tags } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/shared/loading-state";
import {
  getTargetCategories,
  getTargetTemplates,
  getTargetTypes,
} from "@/services/targets.service";
import { useTranslation } from "@/hooks/use-translation";
import { emitTargetsUpdated } from "@/lib/events";
import type {
  TargetCategory,
  TargetTemplate,
  TargetType,
} from "@/types/targets";
import { CategoriesTab } from "./catalog-categories-tab";
import { TypesTab } from "./catalog-types-tab";
import { TemplatesTab } from "./catalog-templates-tab";

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
